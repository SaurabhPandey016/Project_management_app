import type { RequestHandler } from "express";
import type { z } from "zod";

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}
