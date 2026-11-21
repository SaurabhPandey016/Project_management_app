"use client";

import { useSyncExternalStore } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  RotateCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";

const dismissalKey = "issueflow:status-banner-dismissed";
const dismissalEvent = "issueflow:status-banner-dismissal";

function subscribeToDismissal(onChange: () => void) {
  window.addEventListener(dismissalEvent, onChange);
  return () => window.removeEventListener(dismissalEvent, onChange);
}

function getDismissalSnapshot() {
  return window.sessionStorage.getItem(dismissalKey) === "true";
}

function dismissBanner() {
  window.sessionStorage.setItem(dismissalKey, "true");
  window.dispatchEvent(new Event(dismissalEvent));
}

export function ServiceStatusBanner() {
  const { status, elapsedSeconds, retry } = useServiceStatus();
  const isDismissed = useSyncExternalStore(
    subscribeToDismissal,
    getDismissalSnapshot,
    () => false,
  );

  if (status === "live" && isDismissed) return null;

  if (status === "checking" || status === "waking") {
    const progress = Math.min((elapsedSeconds / 75) * 100, 100);

    return (
      <section
        role="status"
        aria-live="polite"
        className="border-b border-indigo-400/15 bg-indigo-400/5 px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <Clock3
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 animate-pulse text-indigo-300"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Our free-tier server is waking up, this can take about a minute.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Server wake-up progress"
                aria-valuemin={0}
                aria-valuemax={75}
                aria-valuenow={Math.min(elapsedSeconds, 75)}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-indigo-400/15"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {elapsedSeconds}s
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (status === "live") {
    return (
      <section
        role="status"
        aria-live="polite"
        className="border-b border-emerald-400/15 bg-emerald-400/5 px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 shrink-0 text-emerald-400"
          />
          <p className="flex-1 text-sm font-medium">
            IssueFlow is live. Your workspace is ready.
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss service status"
            onClick={dismissBanner}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  }

  const isDatabasePaused = status === "db_paused";

  return (
    <section
      role="status"
      aria-live="polite"
      className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Activity
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-amber-300"
          />
          <div>
            <h2 className="text-sm font-semibold">
              {isDatabasePaused
                ? "The database is taking a break"
                : "The service is temporarily offline"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isDatabasePaused
                ? "The API is awake, but its free-tier database may be paused. The project is still available to explore while it resumes."
                : "Our free-tier services may be sleeping to save resources. You can still explore the project walkthrough while they wake."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {env.demoVideoUrl ? (
            <Button
              variant="outline"
              nativeButton={false}
              role="link"
              render={
                <a href={env.demoVideoUrl} target="_blank" rel="noreferrer" />
              }
            >
              Watch project walkthrough
              <ArrowUpRight aria-hidden="true" />
            </Button>
          ) : (
            <span className="px-2 py-2 text-xs text-muted-foreground">
              Walkthrough video coming soon
            </span>
          )}
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={
              <a href={env.linkedInUrl} target="_blank" rel="noreferrer" />
            }
          >
            Connect on LinkedIn
            <ArrowUpRight aria-hidden="true" />
          </Button>
          <Button onClick={retry}>
            <RotateCw aria-hidden="true" />
            Retry now
          </Button>
        </div>
      </div>
    </section>
  );
}
