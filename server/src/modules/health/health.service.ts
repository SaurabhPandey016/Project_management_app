import prisma from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

const databaseCheckTimeoutMs = 3000;

function createTimeout(): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("Database health check timed out")),
      databaseCheckTimeoutMs,
    );
  });

  return {
    promise,
    cancel: () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  };
}

export async function checkDatabase(): Promise<{
  status: "up" | "down";
  latencyMs: number;
}> {
  const startedAt = performance.now();
  const timeout = createTimeout();

  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout.promise]);
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.warn({ err: error }, "Database health check failed");
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    timeout.cancel();
  }
}
