import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section
      aria-label="Loading page"
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
