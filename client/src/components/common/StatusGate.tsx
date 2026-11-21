"use client";

import type { ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";

export function StatusGate({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useServiceStatus();

  return (
    <div>
      {status !== "live" && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 text-sm text-amber-300"
        >
          <Clock3 aria-hidden="true" className="size-4 shrink-0" />
          Waiting for the server
        </p>
      )}
      {children}
    </div>
  );
}
