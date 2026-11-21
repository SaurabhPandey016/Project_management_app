import type { RequestHandler } from "express";
import { authCookieName } from "../config/cookies.js";
import { AppError } from "../lib/AppError.js";
import { verifyToken } from "../lib/jwt.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[authCookieName];

  if (typeof token !== "string") {
    next(new AppError("Authentication is required", 401, "UNAUTHORIZED"));
    return;
  }

  const payload = verifyToken(token);

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    next(new AppError("Authentication is required", 401, "UNAUTHORIZED"));
    return;
  }

  req.user = { id: payload.sub };
  next();
};
