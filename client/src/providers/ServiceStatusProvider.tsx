"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

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
  health: ServiceHealth | null;
  isChecking: boolean;
  refresh: () => Promise<void>;
}

const ServiceStatusContext = createContext<ServiceStatusContextValue | null>(
  null,
);

export function ServiceStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const refresh = useCallback(() => {
    return api
      .get<ServiceHealth>("/health")
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setIsChecking(false));
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const value = useMemo(
    () => ({ health, isChecking, refresh }),
    [health, isChecking, refresh],
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
