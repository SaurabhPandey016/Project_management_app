import { InvitationStatus, Prisma, ProjectRole } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import { emitProjectEvent } from "../issues/events.js";
import { requireProjectRole } from "../projects/permissions.js";
import type { CreateInvitationInput } from "./invitations.validators.js";

export async function createInvitation(
  projectId: string,
  userId: string,
  input: CreateInvitationInput,
) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        await requireProjectRole(ProjectRole.ADMIN)(
          transaction,
          projectId,
          userId,
        );

        const existingMember = await transaction.projectMember.findFirst({
          where: {
            projectId,
            user: { email: input.email },
          },
          select: { id: true },
        });

        if (existingMember !== null) {
          throw new AppError(
            "This user is already a project member",
            409,
            "CONFLICT",
          );
        }

        const pendingInvitation = await transaction.invitation.findFirst({
          where: {
            projectId,
            email: input.email,
            status: InvitationStatus.PENDING,
          },
          select: { id: true },
        });

        if (pendingInvitation !== null) {
          throw new AppError(
            "A pending invitation already exists for this email",
            409,
            "CONFLICT",
          );
        }

        return transaction.invitation.create({
          data: {
            projectId,
            email: input.email,
            role: input.role,
            invitedById: userId,
          },
          include: {
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      if (error.code === "P2034") {
        const pendingInvitation = await prisma.invitation.findFirst({
          where: {
            projectId,
            email: input.email,
            status: InvitationStatus.PENDING,
          },
          select: { id: true },
        });

        if (pendingInvitation === null) {
          throw error;
        }
      }

      throw new AppError(
        "A pending invitation already exists for this email",
        409,
        "CONFLICT",
      );
    }

    throw error;
  }
}

export async function listProjectInvitations(
  projectId: string,
  userId: string,
) {
  await requireProjectRole(ProjectRole.ADMIN)(prisma, projectId, userId);

  return prisma.invitation.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function revokeInvitation(
  projectId: string,
  invitationId: string,
  userId: string,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await requireProjectRole(ProjectRole.ADMIN)(transaction, projectId, userId);

    const invitation = await transaction.invitation.findFirst({
      where: {
        id: invitationId,
        projectId,
        status: InvitationStatus.PENDING,
      },
      select: { id: true },
    });

    if (invitation === null) {
      throw new AppError("Pending invitation not found", 404, "NOT_FOUND");
    }

    await transaction.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED },
    });
  });
}

export async function listMyInvitations(email: string) {
  return prisma.invitation.findMany({
    where: { email: email.toLowerCase(), status: InvitationStatus.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true, key: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function respondToInvitation(
  invitationId: string,
  userId: string,
  email: string,
  accept: boolean,
): Promise<void> {
  try {
    const membership = await prisma.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findFirst({
        where: {
          id: invitationId,
          email: email.toLowerCase(),
          status: InvitationStatus.PENDING,
        },
        select: { id: true, projectId: true, role: true },
      });

      if (invitation === null) {
        throw new AppError("Invitation not found", 404, "NOT_FOUND");
      }

      let joinedMembership:
        | {
            id: string;
            projectId: string;
            userId: string;
            role: ProjectRole;
            joinedAt: Date;
            user: {
              id: string;
              name: string;
              email: string;
              avatarColor: string;
            };
          }
        | undefined;

      if (accept) {
        const membership = await transaction.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: invitation.projectId,
              userId,
            },
          },
          select: { id: true },
        });

        if (membership !== null) {
          throw new AppError(
            "You are already a project member",
            409,
            "CONFLICT",
          );
        }

        joinedMembership = await transaction.projectMember.create({
          data: {
            projectId: invitation.projectId,
            userId,
            role: invitation.role,
          },
          select: {
            id: true,
            projectId: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarColor: true,
              },
            },
          },
        });
      }

      await transaction.invitation.update({
        where: { id: invitation.id },
        data: {
          status: accept
            ? InvitationStatus.ACCEPTED
            : InvitationStatus.DECLINED,
        },
      });

      return joinedMembership;
    });

    if (membership !== undefined) {
      emitProjectEvent(membership.projectId, "member.joined", {
        entity: membership,
        actorId: userId,
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("You are already a project member", 409, "CONFLICT");
    }

    throw error;
  }
}
