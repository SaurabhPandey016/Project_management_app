import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getRouteParam } from "../../lib/getRouteParam.js";
import {
  createComment,
  deleteComment,
  listIssueComments,
  updateComment,
} from "./comments.service.js";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comments.validators.js";

function getUserId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return req.user.id;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const comments = await listIssueComments(
    getRouteParam(req.params.projectId, "projectId"),
    getRouteParam(req.params.issueId, "issueId"),
    getUserId(req),
  );
  res.status(200).json({ success: true, data: comments });
});

export const create = asyncHandler<CreateCommentInput>(
  async (
    req: Request<ParamsDictionary, unknown, CreateCommentInput>,
    res: Response,
  ) => {
    const comment = await createComment(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.issueId, "issueId"),
      getUserId(req),
      req.body,
    );
    res.status(201).json({ success: true, data: comment });
  },
);

export const update = asyncHandler<UpdateCommentInput>(
  async (
    req: Request<ParamsDictionary, unknown, UpdateCommentInput>,
    res: Response,
  ) => {
    const comment = await updateComment(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.commentId, "commentId"),
      getUserId(req),
      req.body,
    );
    res.status(200).json({ success: true, data: comment });
  },
);

export const remove = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const result = await deleteComment(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.commentId, "commentId"),
      getUserId(req),
    );
    res.status(200).json({ success: true, data: result });
  },
);
