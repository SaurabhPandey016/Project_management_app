import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { z } from "zod";

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler<ParamsDictionary, unknown, z.output<TSchema>> {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateParams<TParams extends ParamsDictionary>(
  schema: z.ZodType<TParams>,
): RequestHandler<TParams> {
  return (req, _res, next) => {
    req.params = schema.parse(req.params);
    next();
  };
}
