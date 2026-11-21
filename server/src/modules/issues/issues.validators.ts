import { IssuePriority, IssueStatus, IssueType } from "@prisma/client";
import { z } from "zod";

const commaSeparatedEnum = <TValue extends string>(
  values: readonly [TValue, ...TValue[]],
) =>
  z.preprocess(
    (value: unknown) => {
      if (typeof value === "string") {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      if (Array.isArray(value)) {
        return value
          .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return value;
    },
    z.array(z.enum(values)).optional(),
  );

export const projectIssuesParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const issueParamsSchema = z.object({
  projectId: z.string().min(1),
  issueId: z.string().min(1),
});

export const createIssueSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).optional(),
  type: z.nativeEnum(IssueType),
  priority: z.nativeEnum(IssuePriority),
  assigneeId: z.string().min(1).optional(),
});

export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20_000).nullable().optional(),
    type: z.nativeEnum(IssueType).optional(),
    priority: z.nativeEnum(IssuePriority).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "At least one issue field is required" },
  );

export const moveIssueSchema = z.object({
  status: z.nativeEnum(IssueStatus),
  beforeId: z.string().min(1).optional(),
  afterId: z.string().min(1).optional(),
});

const issueQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  status: commaSeparatedEnum(
    Object.values(IssueStatus) as [IssueStatus, ...IssueStatus[]],
  ),
  priority: commaSeparatedEnum(
    Object.values(IssuePriority) as [IssuePriority, ...IssuePriority[]],
  ),
  type: commaSeparatedEnum(
    Object.values(IssueType) as [IssueType, ...IssueType[]],
  ),
  assigneeId: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "title"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listIssuesQuerySchema = issueQuerySchema;
export const boardIssuesQuerySchema = issueQuerySchema.omit({
  sortBy: true,
  order: true,
  page: true,
  limit: true,
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type BoardIssuesQuery = z.infer<typeof boardIssuesQuerySchema>;
