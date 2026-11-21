import { z } from "zod";

const projectKeySchema = z
  .string()
  .regex(/^[A-Z]{2,5}$/, "Key must be 2-5 uppercase letters");

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  key: projectKeySchema,
  description: z.string().trim().max(2000).optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    {
      message: "At least one project field is required",
    },
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
