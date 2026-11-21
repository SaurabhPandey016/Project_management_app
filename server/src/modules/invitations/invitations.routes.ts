import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import {
  accept,
  create,
  decline,
  listForProject,
  listMine,
  revoke,
} from "./invitations.controller.js";
import {
  createInvitationSchema,
  invitationParamsSchema,
  projectInvitationParamsSchema,
} from "./invitations.validators.js";

export const projectInvitationRoutes = Router();
export const invitationRoutes = Router();

projectInvitationRoutes.use(requireAuth);
projectInvitationRoutes.post(
  "/:projectId/invitations",
  validateParams(projectInvitationParamsSchema),
  validateBody(createInvitationSchema),
  create,
);
projectInvitationRoutes.get(
  "/:projectId/invitations",
  validateParams(projectInvitationParamsSchema),
  listForProject,
);
projectInvitationRoutes.delete(
  "/:projectId/invitations/:id",
  validateParams(
    projectInvitationParamsSchema.extend({
      id: invitationParamsSchema.shape.id,
    }),
  ),
  revoke,
);

invitationRoutes.use(requireAuth);
invitationRoutes.get("/mine", listMine);
invitationRoutes.post(
  "/:id/accept",
  validateParams(invitationParamsSchema),
  accept,
);
invitationRoutes.post(
  "/:id/decline",
  validateParams(invitationParamsSchema),
  decline,
);
