import type { ErrorRequestHandler } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { AppError } from "../lib/AppError.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A record with these values already exists",
        },
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested record was not found",
        },
      });
      return;
    }
  }

  if (error instanceof jwt.JsonWebTokenError) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication is required" },
    });
    return;
  }

  logger.error({ err: error }, "Unhandled request error");
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
