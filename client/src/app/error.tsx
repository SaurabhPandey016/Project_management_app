"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      document.title = "Something went wrong | IssueFlow";
    }
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Something unexpected happened. Try again, or come back in a moment.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
    </section>
  );
}
