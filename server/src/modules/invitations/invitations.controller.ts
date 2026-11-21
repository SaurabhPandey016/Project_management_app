import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getRouteParam } from "../../lib/getRouteParam.js";
import {
  createInvitation,
  listMyInvitations,
  listProjectInvitations,
  respondToInvitation,
  revokeInvitation,
} from "./invitations.service.js";
import type { CreateInvitationInput } from "./invitations.validators.js";

function getUser(req: Request): { id: string; email: string } {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  return req.user;
}

export const create = asyncHandler<CreateInvitationInput>(
  async (
    req: Request<ParamsDictionary, unknown, CreateInvitationInput>,
    res: Response,
  ) => {
    const invitation = await createInvitation(
      getRouteParam(req.params.projectId, "projectId"),
      getUser(req).id,
      req.body,
    );
    res.status(201).json({ success: true, data: invitation });
  },
);

export const listForProject = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const invitations = await listProjectInvitations(
      getRouteParam(req.params.projectId, "projectId"),
      getUser(req).id,
    );
    res.status(200).json({ success: true, data: invitations });
  },
);

export const revoke = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    await revokeInvitation(
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.id, "id"),
      getUser(req).id,
    );
    res.status(204).end();
  },
);

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const invitations = await listMyInvitations(getUser(req).email);
  res.status(200).json({ success: true, data: invitations });
});

export const accept = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const user = getUser(req);
    await respondToInvitation(
      getRouteParam(req.params.id, "id"),
      user.id,
      user.email,
      true,
    );
    res.status(200).json({
      success: true,
      message: "Invitation accepted",
    });
  },
);

export const decline = asyncHandler(
  async (req: Request<ParamsDictionary>, res: Response) => {
    const user = getUser(req);
    await respondToInvitation(
      getRouteParam(req.params.id, "id"),
      user.id,
      user.email,
      false,
    );
    res.status(200).json({
      success: true,
      message: "Invitation declined",
    });
  },
);
