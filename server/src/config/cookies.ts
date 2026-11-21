import type { CookieOptions } from "express";
import { env } from "./env.js";

export const authCookieName = "issueflow_token";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
