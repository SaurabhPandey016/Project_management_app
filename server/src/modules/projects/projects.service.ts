import { IssueStatus, Prisma, ProjectRole } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import { requireProjectRole } from "./permissions.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./projects.validators.js";

export async function createProject(userId: string, input: CreateProjectInput) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          name: input.name,
          key: input.key,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ownerId: userId,
        },
      });

      await transaction.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectRole.OWNER,
        },
      });

      return project;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "A project with this key already exists",
        409,
        "CONFLICT",
      );
    }

    throw error;
  }
}

export async function listProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    orderBy: { project: { createdAt: "desc" } },
    select: {
      role: true,
      project: {
        include: {
          _count: {
            select: {
              members: true,
              issues: { where: { status: { not: IssueStatus.DONE } } },
            },
          },
        },
      },
    },
  });

  return memberships.map(({ role, project }) => {
    const { _count, ...projectDetails } = project;

    return {
      ...projectDetails,
      role,
      memberCount: _count.members,
      openIssueCount: _count.issues,
    };
  });
}

export async function getProjectDetails(projectId: string, userId: string) {
  await requireProjectRole(ProjectRole.MEMBER)(prisma, projectId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          user: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
        },
      },
    },
  });

  if (project === null) {
    throw new AppError("Project not found", 404, "NOT_FOUND");
  }

  return {
    ...project,
    members: project.members.map(({ user, ...membership }) => ({
      ...user,
      role: membership.role,
    })),
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput,
) {
  await requireProjectRole(ProjectRole.ADMIN)(prisma, projectId, userId);

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
    },
  });
}

export async function deleteProject(projectId: string, userId: string) {
  await requireProjectRole(ProjectRole.OWNER)(prisma, projectId, userId);

  await prisma.project.delete({ where: { id: projectId } });
}
