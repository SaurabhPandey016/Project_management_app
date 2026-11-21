"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { env } from "@/lib/env";
import { serviceFailureEvent } from "@/lib/api";

export type ServiceStatus =
  | "checking"
  | "waking"
  | "live"
  | "db_paused"
  | "offline";

export interface ServiceHealth {
  status: "ok";
  service: "api";
  uptime: number;
  timestamp: string;
  db: {
    status: "up" | "down";
    latencyMs: number | null;
  };
}

interface ServiceStatusContextValue {
  status: ServiceStatus;
  lastCheckedAt: string | null;
  latencyMs: number | null;
  elapsedSeconds: number;
  retry: () => void;
}

const ServiceStatusContext = createContext<ServiceStatusContextValue | null>(
  null,
);
const MAX_RETRY_WINDOW_MS = 90_000;
const REQUEST_TIMEOUT_MS = 8_000;
const POLL_INTERVAL_MS = 5_000;
const LIVE_POLL_INTERVAL_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readHealth(value: unknown): ServiceHealth | null {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    return null;
  }

  const data = value.data;
  const database = data.db;
  if (
    data.status !== "ok" ||
    data.service !== "api" ||
    typeof data.uptime !== "number" ||
    typeof data.timestamp !== "string" ||
    !isRecord(database) ||
    (database.status !== "up" && database.status !== "down") ||
    (database.latencyMs !== null && typeof database.latencyMs !== "number")
  ) {
    return null;
  }

  return {
    status: "ok",
    service: "api",
    uptime: data.uptime,
    timestamp: data.timestamp,
    db: {
      status: database.status,
      latencyMs: database.latencyMs,
    },
  };
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getVisibilitySnapshot() {
  return document.visibilityState === "visible";
}

export function ServiceStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<ServiceStatus>("checking");
  const [cycle, setCycle] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isVisible = useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    () => true,
  );
  const statusRef = useRef<ServiceStatus>("checking");
  const startedAtRef = useRef(0);
  const cycleRef = useRef(0);
  const controllersRef = useRef(new Set<AbortController>());
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();
  }, []);

  const updateStatus = useCallback((nextStatus: ServiceStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const beginRecovery = useCallback(
    (initialStatus: ServiceStatus = "checking") => {
      startedAtRef.current = Date.now();
      cycleRef.current += 1;
      setCycle(cycleRef.current);
      setElapsedSeconds(0);
      updateStatus(initialStatus);
    },
    [updateStatus],
  );

  const checkHealth = useCallback(async (cycleId: number) => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const requestStartedAt = Date.now();

    try {
      const response = await fetch(
        `${env.apiUrl.replace(/\/$/, "")}/api/health`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const requestLatency = Date.now() - requestStartedAt;
      if (cycleRef.current !== cycleId) return;

      setLastCheckedAt(new Date().toISOString());
      setLatencyMs(requestLatency);

      if (!response.ok) {
        if (
          statusRef.current === "live" ||
          statusRef.current === "db_paused"
        ) {
          beginRecovery("waking");
        }
        return;
      }

      const health = readHealth(await response.json());
      if (health === null || cycleRef.current !== cycleId) return;

      setLatencyMs(health.db.latencyMs ?? requestLatency);
      updateStatus(health.db.status === "up" ? "live" : "db_paused");
      setElapsedSeconds(
        Math.floor((Date.now() - startedAtRef.current) / 1000),
      );
    } catch {
      if (controller.signal.aborted || cycleRef.current !== cycleId) return;

      setLastCheckedAt(new Date().toISOString());
      setLatencyMs(null);
      if (statusRef.current === "live" || statusRef.current === "db_paused") {
        beginRecovery("waking");
      }
    } finally {
      window.clearTimeout(timeoutId);
      controllersRef.current.delete(controller);
    }
  }, [beginRecovery, updateStatus]);

  const retry = useCallback(() => {
    beginRecovery();
  }, [beginRecovery]);

  useEffect(() => {
    const handleServiceFailure = () => {
      if (statusRef.current !== "checking" && statusRef.current !== "waking") {
        beginRecovery("waking");
      }
    };

    window.addEventListener(serviceFailureEvent, handleServiceFailure);
    return () =>
      window.removeEventListener(serviceFailureEvent, handleServiceFailure);
  }, [beginRecovery]);

  useEffect(() => {
    if (!isVisible) {
      hiddenAtRef.current ??= Date.now();
      return;
    }

    if (hiddenAtRef.current !== null) {
      startedAtRef.current += Date.now() - hiddenAtRef.current;
      hiddenAtRef.current = null;
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || status === "offline") return;

    const cycleId = cycle;
    const activeControllers = controllersRef.current;
    const isRetrying = status === "checking" || status === "waking";
    const pollInterval = isRetrying
      ? POLL_INTERVAL_MS
      : LIVE_POLL_INTERVAL_MS;

    const initialCheckId = window.setTimeout(
      () => void checkHealth(cycleId),
      1_000,
    );
    const pollId = window.setInterval(
      () => void checkHealth(cycleId),
      pollInterval,
    );

    if (!isRetrying) {
      return () => {
        window.clearTimeout(initialCheckId);
        window.clearInterval(pollId);
        activeControllers.forEach((controller) => controller.abort());
      };
    }

    const elapsed = Date.now() - startedAtRef.current;
    const wakeId = window.setTimeout(() => {
      if (statusRef.current === "checking") updateStatus("waking");
    }, Math.max(0, 3_000 - elapsed));
    const offlineId = window.setTimeout(() => {
      if (
        statusRef.current === "checking" ||
        statusRef.current === "waking"
      ) {
        updateStatus("offline");
      }
    }, Math.max(0, MAX_RETRY_WINDOW_MS - elapsed));

    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(pollId);
      window.clearTimeout(wakeId);
      window.clearTimeout(offlineId);
      activeControllers.forEach((controller) => controller.abort());
    };
  }, [cycle, isVisible, status, checkHealth, updateStatus]);

  useEffect(() => {
    if (!isVisible || (status !== "checking" && status !== "waking")) return;

    const updateElapsed = () => {
      setElapsedSeconds(
        Math.floor((Date.now() - startedAtRef.current) / 1000),
      );
    };
    const intervalId = window.setInterval(updateElapsed, 1_000);
    return () => window.clearInterval(intervalId);
  }, [isVisible, status, cycle]);

  const value = useMemo(
    () => ({ status, lastCheckedAt, latencyMs, elapsedSeconds, retry }),
    [status, lastCheckedAt, latencyMs, elapsedSeconds, retry],
  );

  return (
    <ServiceStatusContext.Provider value={value}>
      {children}
    </ServiceStatusContext.Provider>
  );
}

export function useServiceStatus(): ServiceStatusContextValue {
  const context = useContext(ServiceStatusContext);
  if (context === null) {
    throw new Error(
      "useServiceStatus must be used within ServiceStatusProvider",
    );
  }

  return context;
}
