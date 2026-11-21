"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { ServiceStatusProvider } from "@/providers/ServiceStatusProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ServiceStatusProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ServiceStatusProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
