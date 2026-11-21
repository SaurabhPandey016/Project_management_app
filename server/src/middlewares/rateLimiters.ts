import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";

function rateLimitResponse(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
  });
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
  handler: rateLimitResponse,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitResponse,
});
