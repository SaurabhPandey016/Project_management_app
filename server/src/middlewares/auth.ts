import type { RequestHandler } from "express";
import prisma from "../lib/prisma.js";
import { authCookieName } from "../config/cookies.js";
import { AppError } from "../lib/AppError.js";
import { verifyToken } from "../lib/jwt.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token: unknown = req.cookies?.[authCookieName];

    if (typeof token !== "string") {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const payload = verifyToken(token);

    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      payload.purpose !== undefined
    ) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
      },
    });

    if (user === null) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
