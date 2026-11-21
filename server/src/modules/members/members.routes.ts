import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import { remove, updateRole } from "./members.controller.js";
import {
  projectMemberParamsSchema,
  updateMemberRoleSchema,
} from "./members.validators.js";

export const membersRoutes = Router();

membersRoutes.use(requireAuth);
membersRoutes.patch(
  "/:projectId/members/:userId",
  validateParams(projectMemberParamsSchema),
  validateBody(updateMemberRoleSchema),
  updateRole,
);
membersRoutes.delete(
  "/:projectId/members/:userId",
  validateParams(projectMemberParamsSchema),
  remove,
);
