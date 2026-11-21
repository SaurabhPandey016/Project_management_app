import Link from "next/link";
import { Layers3 } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="IssueFlow home"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/30 transition-transform group-hover:scale-105">
        <Layers3 aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span className="text-[1.05rem] font-semibold tracking-tight">
          Issue<span className="text-indigo-400">Flow</span>
        </span>
      )}
    </Link>
  );
}
