import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getRouteParam } from "../../lib/getRouteParam.js";
import { removeProjectMember, updateMemberRole } from "./members.service.js";
import type { UpdateMemberRoleInput } from "./members.validators.js";

function getUserId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return req.user.id;
}

export const updateRole = asyncHandler<UpdateMemberRoleInput>(
  async (
    req: Request<ParamsDictionary, unknown, UpdateMemberRoleInput>,
    res: Response,
  ) => {
    const membership = await updateMemberRole(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
      getRouteParam(req.params.userId, "userId"),
      req.body,
    );

    res.status(200).json({ success: true, data: membership });
  },
);

export const remove = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    await removeProjectMember(
      getRouteParam(req.params.projectId, "projectId"),
      getUserId(req),
      getRouteParam(req.params.userId, "userId"),
    );
    res.status(204).end();
  },
);
