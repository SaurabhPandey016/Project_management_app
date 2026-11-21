import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const allowedOrigins = new Set([env.CLIENT_URL]);

export const corsOptions: CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    callback(null, origin === undefined || allowedOrigins.has(origin));
  },
};
