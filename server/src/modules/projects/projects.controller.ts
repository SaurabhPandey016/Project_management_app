import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getRouteParam } from "../../lib/getRouteParam.js";
import {
  createProject,
  deleteProject,
  getProjectDetails,
  listProjects,
  updateProject,
} from "./projects.service.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./projects.validators.js";

function getUserId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return req.user.id;
}

export const create = asyncHandler<CreateProjectInput>(
  async (
    req: Request<ParamsDictionary, unknown, CreateProjectInput>,
    res: Response,
  ) => {
    const project = await createProject(getUserId(req), req.body);
    res.status(201).json({ success: true, data: project });
  },
);

export const list = asyncHandler(async (req: Request, res: Response) => {
  const projects = await listProjects(getUserId(req));
  res.status(200).json({ success: true, data: projects });
});

export const getById = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const project = await getProjectDetails(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
    );
    res.status(200).json({ success: true, data: project });
  },
);

export const update = asyncHandler<UpdateProjectInput>(
  async (
    req: Request<ParamsDictionary, unknown, UpdateProjectInput>,
    res: Response,
  ) => {
    const project = await updateProject(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
      req.body,
    );
    res.status(200).json({ success: true, data: project });
  },
);

export const remove = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    await deleteProject(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
    );
    res.status(204).end();
  },
);
