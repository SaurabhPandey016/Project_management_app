import type { Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

type AsyncController<TBody> = (
  req: Request<ParamsDictionary, unknown, TBody>,
  res: Response,
) => Promise<void>;

export function asyncHandler<TBody = unknown>(
  controller: AsyncController<TBody>,
): RequestHandler<ParamsDictionary, unknown, TBody> {
  return (req, res, next) => {
    void controller(req, res).catch(next);
  };
}
