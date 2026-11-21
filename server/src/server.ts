import { createServer } from "node:http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import prisma from "./lib/prisma.js";
import app from "./app.js";
import { createSocketServer } from "./sockets/index.js";

const httpServer = createServer(app);
const io = createSocketServer(httpServer);
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down server");

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceShutdownTimer.unref();

  io.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to disconnect Prisma during shutdown",
      );
      process.exitCode = 1;
    } finally {
      clearTimeout(forceShutdownTimer);
    }
  });
}

httpServer.on("error", (error: Error) => {
  logger.error({ err: error }, "HTTP server failed");
  process.exitCode = 1;
});

httpServer.listen(env.PORT, "0.0.0.0", () => {
  logger.info({ port: env.PORT, host: "0.0.0.0" }, "API server listening");
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exitCode = 1;
  void shutdown("unhandledRejection");
});
