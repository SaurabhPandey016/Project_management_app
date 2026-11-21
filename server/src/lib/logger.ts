import pino from "pino";

export const logger = pino({
  level: "info",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]",
  },
});
