import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(10000),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      {
        message: "Must be a PostgreSQL connection URL",
      },
    ),
  DIRECT_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      {
        message: "Must be a PostgreSQL connection URL",
      },
    ),
  JWT_SECRET: z.string().min(32, "Must contain at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhdw]$/, "Must be a duration such as 30m, 7d, or 2w")
    .default("7d"),
  CLIENT_URL: z.string().url(),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(`Invalid server environment:\n${issues}`);
  process.exit(1);
}

export const env = result.data;
