"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { issueTypeIcons, priorityStyles } from "@/lib/constants";
import type { Issue, ProjectRole } from "@/types/domain";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";

const IssueDrawer = dynamic(
  () =>
    import("@/components/projects/IssueDrawer").then(
      (module) => module.IssueDrawer,
    ),
  {
    loading: () => <div aria-label="Loading issue details" role="status" />,
  },
);

const statusLabels: Record<Issue["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function IssueTableSkeleton() {
  return (
    <div
      aria-label="Loading issue results"
      aria-live="polite"
      className="space-y-2"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function ProjectIssueList({
  projectId,
  members,
  role,
  issues,
  isFetching,
  error,
  onPageChange,
  onRetry,
  onClearFilters,
  onChanged,
}: {
  projectId: string;
  members: ProjectMember[];
  role: ProjectRole | undefined;
  issues: { items: Issue[]; total: number; page: number; limit: number } | null;
  isFetching: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedIssueId = searchParams.get("issue");

  function openIssue(issueId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("issue", issueId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeIssue() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("issue");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  if (issues === null && isFetching) return <IssueTableSkeleton />;

  if (issues === null && error) {
    return (
      <Card className="border-red-400/20 bg-red-400/5">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <AlertCircle aria-hidden="true" className="size-5 text-red-300" />
          <div>
            <h2 className="font-semibold">Issues couldn&apos;t be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pageCount = Math.max(1, Math.ceil((issues?.total ?? 0) / 20));
  const resultCount = issues?.total ?? 0;

  return (
    <>
      <section aria-label="Issue results" className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </p>
          {isFetching && issues !== null && (
            <span
              role="status"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="size-2 animate-pulse rounded-full bg-indigo-400" />
              Updating results
            </span>
          )}
        </div>

        {error && issues !== null && (
          <div
            role="alert"
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm"
          >
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {resultCount === 0 ? (
          <Card className="border-dashed border-border/70 bg-card/35">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <h2 className="font-medium">No issues match your filters</h2>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or clearing the selected filters.
              </p>
              <Button type="button" variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div
              className={`hidden overflow-x-auto rounded-xl border border-border/70 transition-opacity md:block ${
                isFetching ? "opacity-60" : "opacity-100"
              }`}
            >
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-muted/45 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Key
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Priority
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Assignee
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {issues?.items.map((issue) => {
                    const TypeIcon = issueTypeIcons[issue.type];
                    return (
                      <tr
                        key={issue.id}
                        tabIndex={0}
                        aria-label={`Open ${issue.key}: ${issue.title}`}
                        onClick={() => openIssue(issue.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openIssue(issue.id);
                          }
                        }}
                        className="cursor-pointer bg-card/35 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {issue.key}
                        </td>
                        <td className="max-w-sm px-4 py-3">
                          <span className="block truncate font-medium text-foreground">
                            {issue.title}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant="outline">
                            {statusLabels[issue.status]}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge
                            variant="outline"
                            className={priorityStyles[issue.priority]}
                          >
                            {issue.priority.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <TypeIcon aria-hidden="true" className="size-4" />
                            {issue.type.toLowerCase()}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {issue.assignee ? (
                            <span className="inline-flex items-center gap-2">
                              <Avatar size="sm">
                                <AvatarFallback
                                  className="text-[0.6rem] font-semibold text-white"
                                  style={{
                                    backgroundColor: issue.assignee.avatarColor,
                                  }}
                                >
                                  {initials(issue.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              {issue.assignee.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(issue.updatedAt), {
                            addSuffix: true,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              className={`space-y-2 transition-opacity md:hidden ${
                isFetching ? "opacity-60" : "opacity-100"
              }`}
            >
              {issues?.items.map((issue) => {
                const TypeIcon = issueTypeIcons[issue.type];
                return (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => openIssue(issue.id)}
                    className="w-full rounded-xl border border-border/70 bg-card/35 p-4 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="text-xs text-muted-foreground">
                          {issue.key}
                        </span>
                        <span className="mt-1 block font-medium">
                          {issue.title}
                        </span>
                      </span>
                      <Badge variant="outline">
                        {statusLabels[issue.status]}
                      </Badge>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={priorityStyles[issue.priority]}
                      >
                        {issue.priority.toLowerCase()}
                      </Badge>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TypeIcon aria-hidden="true" className="size-3.5" />
                        {issue.type.toLowerCase()}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {issue.assignee?.name ?? "Unassigned"}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      Updated{" "}
                      {formatDistanceToNow(new Date(issue.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>

            <nav
              aria-label="Issue result pages"
              className="mt-4 flex items-center justify-between gap-3"
            >
              <p className="text-xs text-muted-foreground">
                Page {issues?.page ?? 1} of {pageCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!issues || issues.page <= 1}
                  onClick={() => onPageChange((issues?.page ?? 1) - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!issues || issues.page >= pageCount}
                  onClick={() => onPageChange((issues?.page ?? 1) + 1)}
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </>
        )}
      </section>

      {selectedIssueId && (
        <IssueDrawer
          key={selectedIssueId}
          projectId={projectId}
          issueId={selectedIssueId}
          role={role}
          members={members}
          onClose={closeIssue}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
