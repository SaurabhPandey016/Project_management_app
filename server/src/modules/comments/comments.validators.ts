import { z } from "zod";

export const issueCommentsParamsSchema = z.object({
  projectId: z.string().min(1),
  issueId: z.string().min(1),
});

export const commentParamsSchema = z.object({
  projectId: z.string().min(1),
  commentId: z.string().min(1),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
