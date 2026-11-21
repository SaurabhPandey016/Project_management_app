import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { authRateLimiter } from "../../middlewares/rateLimiters.js";
import {
  getMe,
  getSocketToken,
  login,
  logout,
  register,
} from "./auth.controller.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.validators.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  register,
);
authRoutes.post("/login", authRateLimiter, validateBody(loginSchema), login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, getMe);
authRoutes.get("/socket-token", requireAuth, getSocketToken);
