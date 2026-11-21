import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import prisma from "../../lib/prisma.js";
import { signSocketToken, signToken } from "../../lib/jwt.js";
import type { LoginInput, RegisterInput } from "./auth.validators.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
} satisfies Prisma.UserSelect;

const dummyPasswordHash = await bcrypt.hash(
  "issueflow-invalid-user-password",
  12,
);

const avatarColors = [
  "#4F46E5",
  "#7C3AED",
  "#2563EB",
  "#0891B2",
  "#059669",
  "#65A30D",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#9333EA",
] as const;

export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const avatarColor = avatarColors[randomInt(avatarColors.length)];

  if (avatarColor === undefined) {
    throw new Error("No avatar colors are configured");
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        avatarColor,
      },
      select: publicUserSelect,
    });

    return { user, token: signToken({ sub: user.id }) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "An account with this email already exists",
        409,
        "CONFLICT",
      );
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      ...publicUserSelect,
      passwordHash: true,
    },
  });
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyPasswordHash,
  );

  if (user === null || !passwordMatches) {
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;

  return {
    user: publicUser,
    token: signToken({ sub: user.id }),
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (user === null) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return user;
}

export function createSocketToken(userId: string): string {
  return signSocketToken(userId);
}
