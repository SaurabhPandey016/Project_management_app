import { z } from "zod";

export const projectInvitationParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const invitationParamsSchema = z.object({
  id: z.string().min(1),
});

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase()),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
