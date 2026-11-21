import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const durationInSeconds: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

function getExpiryInSeconds(duration: string): number {
  const match = /^(\d+)([smhdw])$/.exec(duration);
  const amount = match?.[1];
  const unit = match?.[2];

  if (amount === undefined || unit === undefined) {
    throw new Error("JWT_EXPIRES_IN was not validated");
  }

  return Number(amount) * durationInSeconds[unit]!;
}

export function signToken(
  payload: jwt.JwtPayload,
  expiresInSeconds = getExpiryInSeconds(env.JWT_EXPIRES_IN),
): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });
}

export function signSocketToken(userId: string): string {
  return signToken({ sub: userId, purpose: "socket" }, 60);
}

export function verifyToken(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === "string") {
    return { sub: payload };
  }

  return payload;
}
