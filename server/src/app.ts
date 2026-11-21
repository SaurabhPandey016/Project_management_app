import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { corsOptions } from "./config/cors.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { originCheck } from "./middlewares/originCheck.js";
import { apiRateLimiter } from "./middlewares/rateLimiters.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { commentsRoutes } from "./modules/comments/comments.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import {
  invitationRoutes,
  projectInvitationRoutes,
} from "./modules/invitations/invitations.routes.js";
import { issuesRoutes } from "./modules/issues/issues.routes.js";
import { membersRoutes } from "./modules/members/members.routes.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(apiRateLimiter);
app.use(originCheck);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/projects", commentsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/projects", membersRoutes);
app.use("/api/projects", projectInvitationRoutes);
app.use("/api/projects", issuesRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
