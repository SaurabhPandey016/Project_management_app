import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  IssuePriority,
  IssueStatus,
  IssueType,
  Prisma,
  PrismaClient,
  ProjectRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const [demoPasswordHash, jordanPasswordHash, taylorPasswordHash] =
  await Promise.all([
    bcrypt.hash("Demo@12345", 12),
    bcrypt.hash(randomBytes(32).toString("base64url"), 12),
    bcrypt.hash(randomBytes(32).toString("base64url"), 12),
  ]);

const userSeeds = [
  {
    name: "Alex Morgan",
    email: "demo@issueflow.dev",
    passwordHash: demoPasswordHash,
    avatarColor: "#6366F1",
  },
  {
    name: "Jordan Lee",
    email: "jordan@issueflow.dev",
    passwordHash: jordanPasswordHash,
    avatarColor: "#0EA5E9",
  },
  {
    name: "Taylor Kim",
    email: "taylor@issueflow.dev",
    passwordHash: taylorPasswordHash,
    avatarColor: "#10B981",
  },
] as const;

const issueSeeds = [
  {
    number: 1,
    title: "Fix mobile navigation menu overflow",
    description:
      "The navigation menu extends beyond the viewport on narrow mobile screens.",
    type: IssueType.BUG,
    priority: IssuePriority.HIGH,
    status: IssueStatus.TODO,
    position: 100,
    assigneeIndex: 1,
  },
  {
    number: 2,
    title: "Add keyboard navigation to project switcher",
    description:
      "Support arrow keys, Enter, and Escape in the project switcher.",
    type: IssueType.FEATURE,
    priority: IssuePriority.MEDIUM,
    status: IssueStatus.TODO,
    position: 200,
    assigneeIndex: 0,
  },
  {
    number: 3,
    title: "Improve dashboard loading skeleton",
    description: "Keep dashboard layout stable while project data is loading.",
    type: IssueType.TASK,
    priority: IssuePriority.LOW,
    status: IssueStatus.TODO,
    position: 300,
    assigneeIndex: 2,
  },
  {
    number: 4,
    title: "Prevent duplicate issue submissions",
    description:
      "Disable the submit action while an issue creation request is in flight.",
    type: IssueType.BUG,
    priority: IssuePriority.CRITICAL,
    status: IssueStatus.IN_PROGRESS,
    position: 100,
    assigneeIndex: 0,
  },
  {
    number: 5,
    title: "Add issue filtering by assignee",
    description: "Allow project members to filter the issue board by assignee.",
    type: IssueType.FEATURE,
    priority: IssuePriority.HIGH,
    status: IssueStatus.IN_PROGRESS,
    position: 200,
    assigneeIndex: 1,
  },
  {
    number: 6,
    title: "Normalize project keys in API validation",
    description:
      "Reject keys outside the two-to-five-character uppercase format.",
    type: IssueType.TASK,
    priority: IssuePriority.MEDIUM,
    status: IssueStatus.IN_PROGRESS,
    position: 300,
    assigneeIndex: 2,
  },
  {
    number: 7,
    title: "Restore session after page refresh",
    description:
      "Load the current user from the httpOnly session cookie on startup.",
    type: IssueType.BUG,
    priority: IssuePriority.HIGH,
    status: IssueStatus.IN_PROGRESS,
    position: 400,
    assigneeIndex: 0,
  },
  {
    number: 8,
    title: "Document project invitation workflow",
    description: "Describe how pending invitations and role assignments work.",
    type: IssueType.TASK,
    priority: IssuePriority.LOW,
    status: IssueStatus.IN_PROGRESS,
    position: 500,
    assigneeIndex: 1,
  },
  {
    number: 9,
    title: "Create responsive project overview",
    description:
      "The overview adapts cleanly from small phones to desktop screens.",
    type: IssueType.FEATURE,
    priority: IssuePriority.MEDIUM,
    status: IssueStatus.DONE,
    position: 100,
    assigneeIndex: 2,
  },
  {
    number: 10,
    title: "Add API health endpoint",
    description: "Expose service and database health for deployment checks.",
    type: IssueType.TASK,
    priority: IssuePriority.HIGH,
    status: IssueStatus.DONE,
    position: 200,
    assigneeIndex: 0,
  },
  {
    number: 11,
    title: "Fix stale issue counts after status changes",
    description: "Refresh board counts after moving an issue between columns.",
    type: IssueType.BUG,
    priority: IssuePriority.MEDIUM,
    status: IssueStatus.DONE,
    position: 300,
    assigneeIndex: 1,
  },
  {
    number: 12,
    title: "Add accessible labels to issue controls",
    description: "Ensure icon-only issue actions have accessible names.",
    type: IssueType.TASK,
    priority: IssuePriority.LOW,
    status: IssueStatus.DONE,
    position: 400,
    assigneeIndex: 2,
  },
] as const;

async function seed(): Promise<void> {
  const users = await Promise.all(
    userSeeds.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      }),
    ),
  );
  const [owner, jordan, taylor] = users;

  if (owner === undefined || jordan === undefined || taylor === undefined) {
    throw new Error("Failed to create demo users");
  }

  const projectSeed = {
    name: "Website Revamp",
    key: "WEB",
    description:
      "A collaborative workspace for the IssueFlow website redesign.",
    ownerId: owner.id,
  };
  const existingProject = await prisma.project.findUnique({
    where: { key: projectSeed.key },
  });

  if (
    existingProject !== null &&
    (existingProject.name !== projectSeed.name ||
      existingProject.ownerId !== owner.id)
  ) {
    throw new Error(
      `Cannot seed the demo project: project key ${projectSeed.key} already belongs to a different project.`,
    );
  }

  const project =
    existingProject ?? (await prisma.project.create({ data: projectSeed }));

  const projectMembers = [
    { userId: owner.id, role: ProjectRole.OWNER },
    { userId: jordan.id, role: ProjectRole.ADMIN },
    { userId: taylor.id, role: ProjectRole.MEMBER },
  ];

  await Promise.all(
    projectMembers.map((member) =>
      prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: project.id, userId: member.userId },
        },
        update: {},
        create: { projectId: project.id, ...member },
      }),
    ),
  );

  const issueRecords = await Promise.all(
    issueSeeds.map((issue) =>
      prisma.issue.upsert({
        where: {
          projectId_number: { projectId: project.id, number: issue.number },
        },
        update: {},
        create: {
          projectId: project.id,
          number: issue.number,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          priority: issue.priority,
          status: issue.status,
          position: issue.position,
          reporterId: owner.id,
          assigneeId: users[issue.assigneeIndex]!.id,
        },
      }),
    ),
  );

  await prisma.project.updateMany({
    where: { id: project.id, issueCounter: { lt: issueSeeds.length } },
    data: { issueCounter: issueSeeds.length },
  });

  const issueByNumber = new Map(
    issueRecords.map((issue) => [issue.number, issue]),
  );
  const firstIssue = issueByNumber.get(1);
  const secondIssue = issueByNumber.get(5);

  if (firstIssue === undefined || secondIssue === undefined) {
    throw new Error("Failed to create demo issues");
  }

  const topLevelComments = [
    {
      issueId: firstIssue.id,
      authorId: owner.id,
      content:
        "I can reproduce this on a 320px-wide viewport. The menu needs a max-width.",
    },
    {
      issueId: firstIssue.id,
      authorId: jordan.id,
      content:
        "I will test the fix on both small phones and landscape orientation.",
    },
    {
      issueId: secondIssue.id,
      authorId: taylor.id,
      content: "Should the unassigned option appear at the top of the filter?",
    },
  ];

  const comments = [];

  for (const comment of topLevelComments) {
    const existing = await prisma.comment.findFirst({
      where: {
        issueId: comment.issueId,
        parentId: null,
        authorId: comment.authorId,
        content: comment.content,
      },
    });

    comments.push(
      existing ??
        (await prisma.comment.create({
          data: comment,
        })),
    );
  }

  const replies = [
    {
      parentId: comments[0]!.id,
      issueId: firstIssue.id,
      authorId: taylor.id,
      content: "Agreed. I will add a compact menu layout for narrow screens.",
    },
    {
      parentId: comments[2]!.id,
      issueId: secondIssue.id,
      authorId: owner.id,
      content: "Yes, with a clear label so it is easy to reset the filter.",
    },
  ];

  for (const reply of replies) {
    const existing = await prisma.comment.findFirst({
      where: {
        issueId: reply.issueId,
        parentId: reply.parentId,
        authorId: reply.authorId,
        content: reply.content,
      },
    });

    if (existing === null) {
      await prisma.comment.create({ data: reply });
    }
  }

  console.info(
    `Seed complete: ${users.length} users, 1 project, ${issueRecords.length} issues, and ${comments.length + replies.length} comments.`,
  );
}

try {
  await seed();
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Prisma seed failed (${error.code}): ${error.message}`);
  } else {
    console.error("Prisma seed failed:", error);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
