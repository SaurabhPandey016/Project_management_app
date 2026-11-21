"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function subscribeToMount() {
  return () => {};
}

function getMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    getMountSnapshot,
    getServerMountSnapshot,
  );

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle color theme"
        disabled
      >
        <span className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
