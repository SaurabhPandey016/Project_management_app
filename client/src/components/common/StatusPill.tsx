"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";

const statusDetails = {
  checking: {
    label: "Checking",
    compactLabel: "Checking",
    dot: "bg-slate-400",
  },
  waking: {
    label: "Waking up",
    compactLabel: "Waking",
    dot: "animate-pulse bg-amber-400",
  },
  live: {
    label: "Live",
    compactLabel: "Live",
    dot: "bg-emerald-400",
  },
  db_paused: {
    label: "Database paused",
    compactLabel: "Paused",
    dot: "bg-orange-400",
  },
  offline: {
    label: "Offline",
    compactLabel: "Offline",
    dot: "bg-red-400",
  },
} as const;

function getTooltipText(
  status: keyof typeof statusDetails,
  latencyMs: number | null,
  lastCheckedAt: string | null,
): string {
  const latency = latencyMs === null ? "Latency unavailable" : `${latencyMs} ms`;
  const lastChecked = lastCheckedAt
    ? `Last checked ${new Date(lastCheckedAt).toLocaleTimeString()}`
    : "Not checked yet";

  return `${statusDetails[status].label} · ${latency} · ${lastChecked}`;
}

export function StatusPill({ compact = false }: { compact?: boolean }) {
  const { status, latencyMs, lastCheckedAt } = useServiceStatus();
  const details = statusDetails[status];
  const tooltip = getTooltipText(status, latencyMs, lastCheckedAt);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            aria-label={`Service status: ${tooltip}`}
            tabIndex={0}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${details.dot}`}
        />
        <span className={compact ? "hidden sm:inline" : ""}>
          {details.label}
        </span>
        {compact && <span className="sm:hidden">{details.compactLabel}</span>}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
