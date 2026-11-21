import { ProjectRole, type Prisma } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import { requireProjectRole } from "../projects/permissions.js";
import { emitProjectEvent } from "../issues/events.js";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comments.validators.js";

const commentInclude = {
  author: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
} satisfies Prisma.CommentInclude;

type CommentRecord = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

type CommentNode = CommentRecord & { replies: CommentNode[] };

function buildCommentTree(comments: CommentRecord[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentNode[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (node === undefined) continue;

    if (comment.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(comment.parentId);
    if (parent === undefined) {
      roots.push(node);
      continue;
    }

    parent.replies.push(node);
  }

  return roots;
}

async function assertIssueInProject(
  client: Pick<Prisma.TransactionClient, "issue">,
  projectId: string,
  issueId: string,
): Promise<void> {
  const issue = await client.issue.findFirst({
    where: { id: issueId, projectId },
    select: { id: true },
  });

  if (issue === null) {
    throw new AppError("Issue not found", 404, "NOT_FOUND");
  }
}

async function assertParentDepth(
  transaction: Prisma.TransactionClient,
  issueId: string,
  parentId: string,
): Promise<void> {
  let currentId: string | null = parentId;
  let depth = 1;
  const visited = new Set<string>();

  while (currentId !== null) {
    if (visited.has(currentId)) {
      throw new AppError("Invalid comment thread", 422, "INVALID_COMMENT");
    }
    visited.add(currentId);

    const parent: { issueId: string; parentId: string | null } | null =
      await transaction.comment.findUnique({
        where: { id: currentId },
        select: { issueId: true, parentId: true },
      });

    if (parent === null || parent.issueId !== issueId) {
      throw new AppError(
        "Parent comment must belong to this issue",
        422,
        "INVALID_PARENT",
      );
    }

    depth += 1;
    if (depth > 3) {
      throw new AppError(
        "Comment thread depth cannot exceed 3",
        422,
        "COMMENT_DEPTH_EXCEEDED",
      );
    }

    currentId = parent.parentId;
  }
}

export async function listIssueComments(
  projectId: string,
  issueId: string,
  userId: string,
) {
  await requireProjectRole(ProjectRole.MEMBER)(prisma, projectId, userId);
  await assertIssueInProject(prisma, projectId, issueId);

  const comments = await prisma.comment.findMany({
    where: { issueId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: commentInclude,
  });

  return buildCommentTree(comments);
}

export async function createComment(
  projectId: string,
  issueId: string,
  userId: string,
  input: CreateCommentInput,
) {
  const comment = await prisma.$transaction(async (transaction) => {
    await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );
    await assertIssueInProject(transaction, projectId, issueId);

    if (input.parentId !== undefined) {
      await assertParentDepth(transaction, issueId, input.parentId);
    }

    return transaction.comment.create({
      data: {
        issueId,
        authorId: userId,
        content: input.content,
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      },
      include: commentInclude,
    });
  });

  emitProjectEvent(projectId, "comment.created", {
    entity: comment,
    actorId: userId,
  });
  return comment;
}

export async function updateComment(
  projectId: string,
  commentId: string,
  userId: string,
  input: UpdateCommentInput,
) {
  const comment = await prisma.$transaction(async (transaction) => {
    await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );

    const existing = await transaction.comment.findFirst({
      where: { id: commentId, issue: { projectId } },
      select: { id: true, issueId: true, authorId: true, isDeleted: true },
    });

    if (existing === null) {
      throw new AppError("Comment not found", 404, "NOT_FOUND");
    }

    if (existing.authorId !== userId) {
      throw new AppError(
        "Only the comment author may edit it",
        403,
        "FORBIDDEN",
      );
    }

    if (existing.isDeleted) {
      throw new AppError(
        "Deleted comments cannot be edited",
        409,
        "COMMENT_DELETED",
      );
    }

    return transaction.comment.update({
      where: { id: existing.id },
      data: { content: input.content, editedAt: new Date() },
      include: commentInclude,
    });
  });

  emitProjectEvent(projectId, "comment.updated", {
    entity: comment,
    actorId: userId,
  });
  return comment;
}

export async function deleteComment(
  projectId: string,
  commentId: string,
  userId: string,
): Promise<{ softDeleted: boolean }> {
  const result = await prisma.$transaction(async (transaction) => {
    const actorRole = await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );

    const comment = await transaction.comment.findFirst({
      where: { id: commentId, issue: { projectId } },
      select: {
        id: true,
        issueId: true,
        authorId: true,
        parentId: true,
        content: true,
        isDeleted: true,
        editedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
        _count: { select: { replies: true } },
      },
    });

    if (comment === null) {
      throw new AppError("Comment not found", 404, "NOT_FOUND");
    }

    const isAdmin =
      actorRole === ProjectRole.OWNER || actorRole === ProjectRole.ADMIN;
    if (comment.authorId !== userId && !isAdmin) {
      throw new AppError(
        "You do not have permission to delete this comment",
        403,
        "FORBIDDEN",
      );
    }

    const softDeleted = comment._count.replies > 0;
    let entity: Record<string, unknown> = {
      id: comment.id,
      issueId: comment.issueId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      content: comment.content,
      isDeleted: comment.isDeleted,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
    };
    if (softDeleted) {
      entity = await transaction.comment.update({
        where: { id: comment.id },
        data: { content: "[deleted]", isDeleted: true },
        include: commentInclude,
      });
    } else {
      await transaction.comment.delete({ where: { id: comment.id } });
    }

    return { softDeleted, entity };
  });

  emitProjectEvent(projectId, "comment.deleted", {
    entity: result.entity,
    actorId: userId,
  });
  return { softDeleted: result.softDeleted };
}
