import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getRouteParam } from "../../lib/getRouteParam.js";
import {
  createIssue,
  deleteIssue,
  getIssue,
  getIssueBoard,
  listIssues,
  moveIssue,
  updateIssue,
} from "./issues.service.js";
import {
  boardIssuesQuerySchema,
  listIssuesQuerySchema,
} from "./issues.validators.js";
import type {
  CreateIssueInput,
  MoveIssueInput,
  UpdateIssueInput,
} from "./issues.validators.js";

function getUserId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return req.user.id;
}

export const create = asyncHandler<CreateIssueInput>(
  async (
    req: Request<ParamsDictionary, unknown, CreateIssueInput>,
    res: Response,
  ) => {
    const issue = await createIssue(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
      req.body,
    );
    res.status(201).json({ success: true, data: issue });
  },
);

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listIssuesQuerySchema.parse(req.query);
  const result = await listIssues(
    getRouteParam(req.params.projectId, "projectId"),
    getUserId(req),
    query,
  );
  res.status(200).json({ success: true, data: result });
});

export const board = asyncHandler(async (req: Request, res: Response) => {
  const query = boardIssuesQuerySchema.parse(req.query);
  const result = await getIssueBoard(
    getRouteParam(req.params.projectId, "projectId"),
    getUserId(req),
    query,
  );
  res.status(200).json({ success: true, data: result });
});

export const getById = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const issue = await getIssue(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.issueId, "issueId"),
      getUserId(req),
    );
    res.status(200).json({ success: true, data: issue });
  },
);

export const update = asyncHandler<UpdateIssueInput>(
  async (
    req: Request<ParamsDictionary, unknown, UpdateIssueInput>,
    res: Response,
  ) => {
    const issue = await updateIssue(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.issueId, "issueId"),
      getUserId(req),
      req.body,
    );
    res.status(200).json({ success: true, data: issue });
  },
);

export const move = asyncHandler<MoveIssueInput>(
  async (
    req: Request<ParamsDictionary, unknown, MoveIssueInput>,
    res: Response,
  ) => {
    const result = await moveIssue(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.issueId, "issueId"),
      getUserId(req),
      req.body,
    );
    res.status(200).json({ success: true, data: result });
  },
);

export const remove = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    await deleteIssue(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.issueId, "issueId"),
      getUserId(req),
    );
    res.status(204).end();
  },
);
