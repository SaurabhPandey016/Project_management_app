import { Router } from "express";
import { authRateLimiter } from "../../middlewares/rateLimiters.js";

export const authRoutes = Router();

authRoutes.use(authRateLimiter);
