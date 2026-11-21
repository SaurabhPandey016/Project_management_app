import { IssueStatus, Prisma, ProjectRole } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import { requireProjectRole } from "../projects/permissions.js";
import { emitProjectEvent } from "./events.js";
import type {
  BoardIssuesQuery,
  CreateIssueInput,
  ListIssuesQuery,
  MoveIssueInput,
  UpdateIssueInput,
} from "./issues.validators.js";

const issueInclude = {
  reporter: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  assignee: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  project: { select: { key: true } },
} satisfies Prisma.IssueInclude;

type IncludedIssue = Prisma.IssueGetPayload<{
  include: typeof issueInclude;
}>;

function serializeIssue(
  issue: IncludedIssue & {
    _count?: { comments: number };
  },
) {
  const { project, _count, ...data } = issue;
  return {
    ...data,
    key: `${project.key}-${issue.number}`,
    ...(_count === undefined ? {} : { commentCount: _count.comments }),
  };
}

function buildFilterSql(
  projectId: string,
  query: BoardIssuesQuery,
  userId: string,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`i."project_id" = ${projectId}`];

  if (query.status !== undefined && query.status.length > 0) {
    conditions.push(
      Prisma.sql`i."status" IN (${Prisma.join(
        query.status.map((status) => Prisma.sql`${status}::"IssueStatus"`),
      )})`,
    );
  }

  if (query.priority !== undefined && query.priority.length > 0) {
    conditions.push(
      Prisma.sql`i."priority" IN (${Prisma.join(
        query.priority.map(
          (priority) => Prisma.sql`${priority}::"IssuePriority"`,
        ),
      )})`,
    );
  }

  if (query.type !== undefined && query.type.length > 0) {
    conditions.push(
      Prisma.sql`i."type" IN (${Prisma.join(
        query.type.map((type) => Prisma.sql`${type}::"IssueType"`),
      )})`,
    );
  }

  if (query.assigneeId === "unassigned") {
    conditions.push(Prisma.sql`i."assignee_id" IS NULL`);
  } else if (query.assigneeId === "me") {
    conditions.push(Prisma.sql`i."assignee_id" = ${userId}`);
  } else if (query.assigneeId !== undefined) {
    conditions.push(Prisma.sql`i."assignee_id" = ${query.assigneeId}`);
  }

  if (query.q !== undefined) {
    const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean);
    for (const term of terms) {
      const search = `%${term}%`;
      const issueKey = /^([a-z]{2,5})-(\d+)$/i.exec(term);
      const issueKeyMatch =
        issueKey === null
          ? Prisma.sql`FALSE`
          : Prisma.sql`(
              UPPER(p."key") = ${issueKey[1].toUpperCase()}
              AND i."number"::text ILIKE ${`%${issueKey[2]}%`}
            )`;

      conditions.push(
        Prisma.sql`(
          i."title" ILIKE ${search}
          OR i."description" ILIKE ${search}
          OR i."number"::text ILIKE ${search}
          OR ${issueKeyMatch}
        )`,
      );
    }
  }

  return Prisma.join(conditions, " AND ");
}

function issueOrderSql(query: ListIssuesQuery): Prisma.Sql {
  const order = query.order === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  if (query.sortBy === "priority") {
    const direction =
      query.order === "asc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    return Prisma.sql`CASE i."priority"
      WHEN 'CRITICAL' THEN 0
      WHEN 'HIGH' THEN 1
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 3
    END ${direction}, i."position" ASC, i."id" ASC`;
  }

  if (query.sortBy === "createdAt") {
    return Prisma.sql`i."created_at" ${order}, i."id" ASC`;
  }

  if (query.sortBy === "updatedAt") {
    return Prisma.sql`i."updated_at" ${order}, i."id" ASC`;
  }

  if (query.sortBy === "title") {
    return Prisma.sql`i."title" ${order}, i."id" ASC`;
  }

  return Prisma.sql`CASE i."status"
      WHEN 'TODO' THEN 0
      WHEN 'IN_PROGRESS' THEN 1
      WHEN 'DONE' THEN 2
    END ASC, i."position" ASC, i."id" ASC`;
}

async function findFilteredIssueIds(
  projectId: string,
  query: BoardIssuesQuery,
  userId: string,
  orderBy: Prisma.Sql,
  pagination?: { skip: number; take: number },
  includeTotal = true,
): Promise<{ ids: string[]; total: number }> {
  const whereSql = buildFilterSql(projectId, query, userId);
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT i."id"
      FROM "issues" i
      INNER JOIN "projects" p ON p."id" = i."project_id"
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      ${pagination === undefined ? Prisma.empty : Prisma.sql`OFFSET ${pagination.skip} LIMIT ${pagination.take}`}
    `,
    includeTotal
      ? prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*)::bigint AS total
          FROM "issues" i
          INNER JOIN "projects" p ON p."id" = i."project_id"
          WHERE ${whereSql}
        `
      : Promise.resolve(null),
  ]);

  return {
    ids: rows.map((row) => row.id),
    total: countRows === null ? 0 : Number(countRows[0]?.total ?? 0n),
  };
}

async function getIssuesByOrderedIds(
  ids: string[],
  includeCommentCount = false,
) {
  if (ids.length === 0) return [];

  const issues = await prisma.issue.findMany({
    where: { id: { in: ids } },
    include: {
      ...issueInclude,
      ...(includeCommentCount
        ? { _count: { select: { comments: true } } }
        : {}),
    },
  });
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));

  return ids.flatMap((id) => {
    const issue = issueById.get(id);
    return issue === undefined ? [] : [serializeIssue(issue)];
  });
}

async function requireAssigneeMembership(
  transaction: Prisma.TransactionClient,
  projectId: string,
  assigneeId: string | null | undefined,
): Promise<void> {
  if (assigneeId === undefined || assigneeId === null) return;

  const membership = await transaction.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: assigneeId },
    },
    select: { id: true },
  });

  if (membership === null) {
    throw new AppError(
      "Assignee must be a member of this project",
      422,
      "INVALID_ASSIGNEE",
    );
  }
}

export async function createIssue(
  projectId: string,
  userId: string,
  input: CreateIssueInput,
) {
  const issue = await prisma.$transaction(
    async (transaction) => {
      await requireProjectRole(ProjectRole.MEMBER)(
        transaction,
        projectId,
        userId,
      );
      await requireAssigneeMembership(transaction, projectId, input.assigneeId);

      const project = await transaction.project.update({
        where: { id: projectId },
        data: { issueCounter: { increment: 1 } },
        select: { issueCounter: true, key: true },
      });
      const lastIssue = await transaction.issue.findFirst({
        where: { projectId, status: IssueStatus.TODO },
        orderBy: [{ position: "desc" }, { id: "desc" }],
        select: { position: true },
      });

      return transaction.issue.create({
        data: {
          projectId,
          number: project.issueCounter,
          title: input.title,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          type: input.type,
          priority: input.priority,
          status: IssueStatus.TODO,
          position: (lastIssue?.position ?? 0) + 1000,
          reporterId: userId,
          ...(input.assigneeId === undefined
            ? {}
            : { assigneeId: input.assigneeId }),
        },
        include: issueInclude,
      });
    },
    { timeout: 15_000 },
  );

  const serialized = serializeIssue(issue);
  emitProjectEvent(projectId, "issue.created", {
    entity: serialized,
    actorId: userId,
  });
  return serialized;
}

export async function listIssues(
  projectId: string,
  userId: string,
  query: ListIssuesQuery,
) {
  await requireProjectRole(ProjectRole.MEMBER)(prisma, projectId, userId);
  const page = query.page;
  const limit = query.limit;
  const { ids, total } = await findFilteredIssueIds(
    projectId,
    query,
    userId,
    issueOrderSql(query),
    { skip: (page - 1) * limit, take: limit },
  );

  return {
    items: await getIssuesByOrderedIds(ids),
    total,
    page,
    limit,
  };
}

export async function getIssueBoard(
  projectId: string,
  userId: string,
  query: BoardIssuesQuery,
) {
  await requireProjectRole(ProjectRole.MEMBER)(prisma, projectId, userId);
  const { ids } = await findFilteredIssueIds(
    projectId,
    query,
    userId,
    Prisma.sql`CASE i."status"
      WHEN 'TODO' THEN 0
      WHEN 'IN_PROGRESS' THEN 1
      WHEN 'DONE' THEN 2
    END ASC, i."position" ASC, i."id" ASC`,
    undefined,
    false,
  );
  const issues = await getIssuesByOrderedIds(ids, true);
  const board: Record<IssueStatus, typeof issues> = {
    [IssueStatus.TODO]: [],
    [IssueStatus.IN_PROGRESS]: [],
    [IssueStatus.DONE]: [],
  };

  for (const issue of issues) {
    board[issue.status].push(issue);
  }

  return board;
}

export async function getIssue(
  projectId: string,
  issueId: string,
  userId: string,
) {
  await requireProjectRole(ProjectRole.MEMBER)(prisma, projectId, userId);

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId },
    include: {
      ...issueInclude,
      _count: { select: { comments: true } },
    },
  });

  if (issue === null) {
    throw new AppError("Issue not found", 404, "NOT_FOUND");
  }

  const { project, _count, ...data } = issue;
  return {
    ...data,
    key: `${project.key}-${issue.number}`,
    commentCount: _count.comments,
  };
}

export async function updateIssue(
  projectId: string,
  issueId: string,
  userId: string,
  input: UpdateIssueInput,
) {
  const issue = await prisma.$transaction(async (transaction) => {
    const actorRole = await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );
    const existing = await transaction.issue.findFirst({
      where: { id: issueId, projectId },
      select: { id: true, reporterId: true, assigneeId: true },
    });

    if (existing === null) {
      throw new AppError("Issue not found", 404, "NOT_FOUND");
    }

    if (
      actorRole === ProjectRole.MEMBER &&
      existing.reporterId !== userId &&
      existing.assigneeId !== userId
    ) {
      throw new AppError(
        "You do not have permission to edit this issue",
        403,
        "FORBIDDEN",
      );
    }

    await requireAssigneeMembership(transaction, projectId, input.assigneeId);

    return transaction.issue.update({
      where: { id: existing.id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.assigneeId === undefined
          ? {}
          : { assigneeId: input.assigneeId }),
      },
      include: issueInclude,
    });
  });

  const serialized = serializeIssue(issue);
  emitProjectEvent(projectId, "issue.updated", {
    entity: serialized,
    actorId: userId,
  });
  return serialized;
}

export async function moveIssue(
  projectId: string,
  issueId: string,
  userId: string,
  input: MoveIssueInput,
) {
  const result = await prisma.$transaction(
    async (transaction) => {
      await requireProjectRole(ProjectRole.MEMBER)(
        transaction,
        projectId,
        userId,
      );

      const issue = await transaction.issue.findFirst({
        where: { id: issueId, projectId },
        select: { id: true, status: true },
      });

      if (issue === null) {
        throw new AppError("Issue not found", 404, "NOT_FOUND");
      }

      if (input.beforeId === issueId || input.afterId === issueId) {
        throw new AppError(
          "An issue cannot be positioned relative to itself",
          422,
          "INVALID_POSITION",
        );
      }

      const targetIssues = await transaction.issue.findMany({
        where: { projectId, status: input.status, id: { not: issueId } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, position: true },
      });

      let beforeId = input.beforeId;
      let afterId = input.afterId;
      let beforeIndex =
        beforeId === undefined
          ? -1
          : targetIssues.findIndex((candidate) => candidate.id === beforeId);
      let afterIndex =
        afterId === undefined
          ? -1
          : targetIssues.findIndex((candidate) => candidate.id === afterId);

      if (
        (beforeId !== undefined && beforeIndex < 0) ||
        (afterId !== undefined && afterIndex < 0)
      ) {
        throw new AppError(
          "Position anchors must be issues in the target column",
          422,
          "INVALID_POSITION",
        );
      }

      if (
        beforeIndex >= 0 &&
        afterIndex >= 0 &&
        afterIndex !== beforeIndex + 1
      ) {
        throw new AppError(
          "Position anchors must be adjacent and in order",
          422,
          "INVALID_POSITION",
        );
      }

      if (beforeIndex >= 0 && afterId === undefined) {
        afterIndex = beforeIndex + 1;
        afterId = targetIssues[afterIndex]?.id;
      } else if (afterIndex >= 0 && beforeId === undefined) {
        beforeIndex = afterIndex - 1;
        beforeId = targetIssues[beforeIndex]?.id;
      } else if (beforeId === undefined && afterId === undefined) {
        beforeIndex = targetIssues.length - 1;
        beforeId = targetIssues[beforeIndex]?.id;
      }

      let before = beforeIndex < 0 ? undefined : targetIssues[beforeIndex];
      let after = afterIndex < 0 ? undefined : targetIssues[afterIndex];

      let rebalanced = false;
      if (before !== undefined && after !== undefined) {
        const gap = after.position - before.position;

        if (gap < 0.001) {
          rebalanced = true;
          await transaction.$executeRaw`
          UPDATE "issues" AS issue
          SET "position" = rebalance."position"
          FROM (
            SELECT
              "id",
              CAST(ROW_NUMBER() OVER (ORDER BY "position" ASC, "id" ASC) AS double precision) * 1000 AS "position"
            FROM "issues"
            WHERE "project_id" = ${projectId}
              AND "status" = ${input.status}::"IssueStatus"
              AND "id" <> ${issueId}
          ) AS rebalance
          WHERE issue."id" = rebalance."id"
        `;
          targetIssues.forEach((targetIssue, index) => {
            targetIssue.position = (index + 1) * 1000;
          });
          before = beforeIndex < 0 ? undefined : targetIssues[beforeIndex];
          after = afterIndex < 0 ? undefined : targetIssues[afterIndex];
        }
      }

      let position: number;
      if (before !== undefined && after !== undefined) {
        position = (before.position + after.position) / 2;
      } else if (after !== undefined) {
        position = after.position - 1000;
      } else if (before !== undefined) {
        position = before.position + 1000;
      } else {
        position = 1000;
      }

      const movedIssue = await transaction.issue.update({
        where: { id: issue.id },
        data: { status: input.status, position },
        include: issueInclude,
      });

      return {
        issue: movedIssue,
        rebalanced,
      };
    },
    { timeout: 15_000 },
  );

  emitProjectEvent(projectId, "issue.moved", {
    entity: serializeIssue(result.issue),
    actorId: userId,
  });

  return {
    issue: serializeIssue(result.issue),
    rebalanced: result.rebalanced,
  };
}

export async function deleteIssue(
  projectId: string,
  issueId: string,
  userId: string,
): Promise<void> {
  const issue = await prisma.$transaction(async (transaction) => {
    const actorRole = await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );
    const issue = await transaction.issue.findFirst({
      where: { id: issueId, projectId },
      include: issueInclude,
    });

    if (issue === null) {
      throw new AppError("Issue not found", 404, "NOT_FOUND");
    }

    if (actorRole === ProjectRole.MEMBER && issue.reporterId !== userId) {
      throw new AppError(
        "You do not have permission to delete this issue",
        403,
        "FORBIDDEN",
      );
    }

    await transaction.issue.delete({ where: { id: issue.id } });
    return serializeIssue(issue);
  });

  emitProjectEvent(projectId, "issue.deleted", {
    entity: issue,
    actorId: userId,
  });
}
