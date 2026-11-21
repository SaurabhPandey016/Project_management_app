import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import { create, list, remove, update } from "./comments.controller.js";
import {
  commentParamsSchema,
  createCommentSchema,
  issueCommentsParamsSchema,
  updateCommentSchema,
} from "./comments.validators.js";

export const commentsRoutes = Router();

commentsRoutes.use(requireAuth);
commentsRoutes.get(
  "/:projectId/issues/:issueId/comments",
  validateParams(issueCommentsParamsSchema),
  list,
);
commentsRoutes.post(
  "/:projectId/issues/:issueId/comments",
  validateParams(issueCommentsParamsSchema),
  validateBody(createCommentSchema),
  create,
);
commentsRoutes.patch(
  "/:projectId/comments/:commentId",
  validateParams(commentParamsSchema),
  validateBody(updateCommentSchema),
  update,
);
commentsRoutes.delete(
  "/:projectId/comments/:commentId",
  validateParams(commentParamsSchema),
  remove,
);
