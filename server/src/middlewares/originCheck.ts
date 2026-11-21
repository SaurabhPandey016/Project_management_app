import type { RequestHandler } from "express";
import { allowedOrigins } from "../config/cors.js";
import { AppError } from "../lib/AppError.js";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const originCheck: RequestHandler = (req, _res, next) => {
  const origin = req.get("origin");

  if (
    writeMethods.has(req.method) &&
    origin !== undefined &&
    !allowedOrigins.has(origin)
  ) {
    next(new AppError("Request origin is not allowed", 403, "FORBIDDEN"));
    return;
  }

  next();
};
