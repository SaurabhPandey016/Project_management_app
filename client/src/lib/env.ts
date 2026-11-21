import { z } from "zod";

const publicEnvironmentSchema = z.object({
  apiUrl: z.string().url(),
  socketUrl: z.string().url(),
  demoVideoUrl: z.union([z.literal(""), z.url()]),
  linkedInUrl: z.string().url(),
  githubUrl: z.string().url(),
  contactEmail: z.string().email(),
});

const result = publicEnvironmentSchema.safeParse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:10000",
  demoVideoUrl: process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || "",
  linkedInUrl:
    process.env.NEXT_PUBLIC_LINKEDIN_URL ||
    "https://www.linkedin.com/in/saurabhpandey-/",
  githubUrl:
    process.env.NEXT_PUBLIC_GITHUB_URL ||
    "https://github.com/SaurabhPandey016",
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || "developersaurabh001@gmail.com",
});

if (!result.success) {
  throw new Error(
    `Invalid client environment: ${result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const env = result.data;
