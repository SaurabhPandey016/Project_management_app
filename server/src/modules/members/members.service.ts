import { IssueStatus, ProjectRole } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import {
  canRemoveMember,
  requireProjectRole,
} from "../projects/permissions.js";
import { emitProjectEvent } from "../issues/events.js";
import type { UpdateMemberRoleInput } from "./members.validators.js";

export async function updateMemberRole(
  projectId: string,
  userId: string,
  targetUserId: string,
  input: UpdateMemberRoleInput,
) {
  await requireProjectRole(ProjectRole.OWNER)(prisma, projectId, userId);

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: targetUserId },
    },
    select: { id: true, role: true },
  });

  if (membership === null) {
    throw new AppError("Project member not found", 404, "NOT_FOUND");
  }

  if (membership.role === ProjectRole.OWNER) {
    throw new AppError(
      "The project owner role cannot be changed",
      403,
      "FORBIDDEN",
    );
  }

  return prisma.projectMember.update({
    where: { id: membership.id },
    data: { role: input.role },
    select: {
      id: true,
      role: true,
      user: {
        select: { id: true, name: true, email: true, avatarColor: true },
      },
    },
  });
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
  targetUserId: string,
): Promise<void> {
  const removedMembership = await prisma.$transaction(async (transaction) => {
    const actorRole = await requireProjectRole(ProjectRole.MEMBER)(
      transaction,
      projectId,
      userId,
    );
    const membership = await transaction.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
      select: {
        id: true,
        role: true,
        projectId: true,
        userId: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
    });

    if (membership === null) {
      throw new AppError("Project member not found", 404, "NOT_FOUND");
    }

    const isSelf = userId === targetUserId;

    if (!canRemoveMember(actorRole, membership.role, isSelf)) {
      const message =
        membership.role === ProjectRole.OWNER
          ? "The project owner cannot be removed or leave the project"
          : "You do not have permission to remove this member";
      throw new AppError(message, 403, "FORBIDDEN");
    }

    await transaction.issue.updateMany({
      where: {
        projectId,
        assigneeId: targetUserId,
        status: { not: IssueStatus.DONE },
      },
      data: { assigneeId: null },
    });

    await transaction.projectMember.delete({
      where: { id: membership.id },
    });
    return membership;
  });

  emitProjectEvent(projectId, "member.removed", {
    entity: removedMembership,
    actorId: userId,
  });
}
