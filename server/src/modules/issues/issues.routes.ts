import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import {
  board,
  create,
  getById,
  list,
  move,
  remove,
  update,
} from "./issues.controller.js";
import {
  createIssueSchema,
  issueParamsSchema,
  moveIssueSchema,
  projectIssuesParamsSchema,
  updateIssueSchema,
} from "./issues.validators.js";

export const issuesRoutes = Router();

issuesRoutes.use(requireAuth);
issuesRoutes.post(
  "/:projectId/issues",
  validateParams(projectIssuesParamsSchema),
  validateBody(createIssueSchema),
  create,
);
issuesRoutes.get(
  "/:projectId/issues",
  validateParams(projectIssuesParamsSchema),
  list,
);
issuesRoutes.get(
  "/:projectId/board",
  validateParams(projectIssuesParamsSchema),
  board,
);
issuesRoutes.get(
  "/:projectId/issues/:issueId",
  validateParams(issueParamsSchema),
  getById,
);
issuesRoutes.patch(
  "/:projectId/issues/:issueId/move",
  validateParams(issueParamsSchema),
  validateBody(moveIssueSchema),
  move,
);
issuesRoutes.patch(
  "/:projectId/issues/:issueId",
  validateParams(issueParamsSchema),
  validateBody(updateIssueSchema),
  update,
);
issuesRoutes.delete(
  "/:projectId/issues/:issueId",
  validateParams(issueParamsSchema),
  remove,
);
