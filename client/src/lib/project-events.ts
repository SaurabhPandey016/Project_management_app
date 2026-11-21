import type { Comment, Issue, User } from "@/types/domain";

const issueStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
const issuePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const issueTypes = ["BUG", "FEATURE", "TASK"] as const;

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    typeof user.avatarColor === "string"
  );
}

export function parseIssueEvent(
  value: Record<string, unknown>,
  projectId: string,
): Issue | null {
  if (
    value.projectId !== projectId ||
    typeof value.id !== "string" ||
    typeof value.number !== "number" ||
    typeof value.key !== "string" ||
    typeof value.title !== "string" ||
    !(typeof value.description === "string" || value.description === null) ||
    !issueTypes.includes(value.type as (typeof issueTypes)[number]) ||
    !issuePriorities.includes(
      value.priority as (typeof issuePriorities)[number],
    ) ||
    !issueStatuses.includes(value.status as (typeof issueStatuses)[number]) ||
    typeof value.position !== "number" ||
    typeof value.reporterId !== "string" ||
    !(typeof value.assigneeId === "string" || value.assigneeId === null) ||
    !isUser(value.reporter) ||
    !(value.assignee === null || isUser(value.assignee)) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }
  return value as unknown as Issue;
}

export function parseCommentEvent(
  value: Record<string, unknown>,
): Comment | null {
  if (
    typeof value.id !== "string" ||
    typeof value.issueId !== "string" ||
    typeof value.authorId !== "string" ||
    !(typeof value.parentId === "string" || value.parentId === null) ||
    typeof value.content !== "string" ||
    typeof value.isDeleted !== "boolean" ||
    !(typeof value.editedAt === "string" || value.editedAt === null) ||
    typeof value.createdAt !== "string" ||
    !isUser(value.author)
  ) {
    return null;
  }
  return { ...(value as Omit<Comment, "replies">), replies: [] };
}
