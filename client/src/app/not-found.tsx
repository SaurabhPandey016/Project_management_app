import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
        <SearchX aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-sm font-medium text-indigo-300">404 · Not found</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        This page went missing
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The link may be outdated, or the page may have moved.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        role="link"
        render={<Link href="/" />}
      >
        <ArrowLeft aria-hidden="true" />
        Back to home
      </Button>
    </section>
  );
}
