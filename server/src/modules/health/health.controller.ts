import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { checkDatabase } from "./health.service.js";

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const db = await checkDatabase();

  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db,
    },
  });
});
