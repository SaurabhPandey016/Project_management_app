"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";

export function TryDemoButton({
  className,
  variant = "secondary",
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const { login } = useAuth();
  const { status } = useServiceStatus();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function tryDemo() {
    setIsSubmitting(true);
    try {
      await login("demo@issueflow.dev", "Demo@12345");
      toast.success("Welcome to the IssueFlow demo");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to open the demo",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isUnavailable = status !== "live";

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={isSubmitting || isUnavailable}
      onClick={tryDemo}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : (
        <Sparkles aria-hidden="true" />
      )}
      {isUnavailable
        ? "Waiting for the server"
        : isSubmitting
          ? "Opening demo..."
          : "Try demo account"}
    </Button>
  );
}
