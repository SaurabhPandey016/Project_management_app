import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import {
  create,
  getById,
  list,
  remove,
  update,
} from "./projects.controller.js";
import {
  createProjectSchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "./projects.validators.js";

export const projectsRoutes = Router();

projectsRoutes.use(requireAuth);
projectsRoutes.post("/", validateBody(createProjectSchema), create);
projectsRoutes.get("/", list);
projectsRoutes.get(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  getById,
);
projectsRoutes.patch(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  validateBody(updateProjectSchema),
  update,
);
projectsRoutes.delete(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  remove,
);
