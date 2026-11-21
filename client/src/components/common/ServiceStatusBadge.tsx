"use client";

import { Activity, CircleAlert, LoaderCircle } from "lucide-react";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";

export function ServiceStatusBadge() {
  const { health, isChecking } = useServiceStatus();
  const isOnline = health?.status === "ok";
  const isDatabaseOnline = health?.db.status === "up";

  const label = isChecking
    ? "Checking services"
    : !isOnline
      ? "API unavailable"
      : isDatabaseOnline
        ? "All systems operational"
        : "Database unavailable";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground"
      title={label}
      aria-label={`Service status: ${label}`}
    >
      {isChecking ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-3.5 animate-spin text-indigo-300"
        />
      ) : isOnline && isDatabaseOnline ? (
        <Activity
          aria-hidden="true"
          className="size-3.5 text-emerald-400"
        />
      ) : (
        <CircleAlert
          aria-hidden="true"
          className="size-3.5 text-amber-400"
        />
      )}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Status</span>
    </span>
  );
}
