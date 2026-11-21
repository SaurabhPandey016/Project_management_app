import { ProjectRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";

const roleRank: Record<ProjectRole, number> = {
  [ProjectRole.MEMBER]: 1,
  [ProjectRole.ADMIN]: 2,
  [ProjectRole.OWNER]: 3,
};

export function hasMinimumProjectRole(
  actualRole: ProjectRole,
  minimumRole: ProjectRole,
): boolean {
  return roleRank[actualRole] >= roleRank[minimumRole];
}

export function requireProjectRole(minimumRole: ProjectRole) {
  return async function checkProjectRole(
    client: Pick<Prisma.TransactionClient, "projectMember">,
    projectId: string,
    userId: string,
  ): Promise<ProjectRole> {
    const membership = await client.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (membership === null) {
      throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    if (!hasMinimumProjectRole(membership.role, minimumRole)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
        "FORBIDDEN",
      );
    }

    return membership.role;
  };
}

export function canRemoveMember(
  actorRole: ProjectRole,
  targetRole: ProjectRole,
  isSelf: boolean,
): boolean {
  if (targetRole === ProjectRole.OWNER) {
    return false;
  }

  if (isSelf) {
    return true;
  }

  if (actorRole === ProjectRole.OWNER) {
    return true;
  }

  return actorRole === ProjectRole.ADMIN && targetRole === ProjectRole.MEMBER;
}
