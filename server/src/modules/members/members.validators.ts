import { z } from "zod";

export const projectMemberParamsSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
