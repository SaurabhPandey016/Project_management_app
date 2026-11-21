"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckSquare,
  CircleDot,
  FolderKanban,
  Settings2,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { Issue, ProjectRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  ProjectSettingsPanel,
  type ProjectWithMembers,
} from "@/components/projects/ProjectSettingsPanel";
import { NewIssueDialog } from "@/components/projects/NewIssueDialog";
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { IssueFilterBar } from "@/components/projects/IssueFilterBar";
import { ProjectIssueList } from "@/components/projects/ProjectIssueList";
import { useIssueFilters } from "@/hooks/useIssueFilters";

interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  limit: number;
}

type ProjectView = "board" | "list" | "settings";

const projectSkeletonColumns = ["TODO", "IN_PROGRESS", "DONE"] as const;

const views: Array<{ label: string; href: string; view: ProjectView }> = [
  { label: "Board", href: "", view: "board" },
  { label: "List", href: "/list", view: "list" },
  { label: "Settings", href: "/settings", view: "settings" },
];

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Unable to load this project";
}

export function ProjectWorkspace({
  projectId,
  view,
}: {
  projectId: string;
  view: ProjectView;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount,
    listQuery,
    boardQuery,
  } = useIssueFilters();
  const [project, setProject] = useState<
    (ProjectWithMembers & { role?: ProjectRole }) | null
  >(null);
  const [issues, setIssues] = useState<IssueListResponse | null>(null);
  const [resolvedIssueRequest, setResolvedIssueRequest] = useState<string | null>(
    null,
  );
  const [issueListError, setIssueListError] = useState<{
    request: string;
    message: string;
  } | null>(null);
  const [issueListRefreshKey, setIssueListRefreshKey] = useState(0);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(() => {
    return api
      .get<ProjectWithMembers>(`/projects/${projectId}`)
      .then((details) => {
        const role =
          details.members.find((member) => member.id === user?.id)?.role ??
          (details.ownerId === user?.id ? "OWNER" : undefined);
        setProject({ ...details, role });
      })
      .catch((requestError: unknown) => setError(messageFor(requestError)))
      .finally(() => setIsLoading(false));
  }, [projectId, user?.id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (view !== "list") return;
    let active = true;
    const request = `${projectId}:${listQuery}:${issueListRefreshKey}`;
    api
      .get<IssueListResponse>(`/projects/${projectId}/issues?${listQuery}`)
      .then((response) => {
        if (!active) return;
        setIssues(response);
        setResolvedIssueRequest(request);
        setIssueListError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setIssueListError({ request, message: messageFor(requestError) });
        setResolvedIssueRequest(request);
      });

    return () => {
      active = false;
    };
  }, [issueListRefreshKey, listQuery, projectId, view]);

  function retryLoadingProject() {
    setIsLoading(true);
    setError(null);
    void loadProject();
  }

  function refreshIssueList() {
    setIssueListRefreshKey((key) => key + 1);
  }
  const issueListRequest = `${projectId}:${listQuery}:${issueListRefreshKey}`;
  const isIssueListFetching =
    view === "list" && resolvedIssueRequest !== issueListRequest;
  const currentIssueListError =
    issueListError?.request === issueListRequest
      ? issueListError.message
      : null;

  return (
    <section className="mx-auto w-full max-w-7xl">
      {isLoading ? (
        <div aria-label="Loading project" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {projectSkeletonColumns.map((column) => (
              <Skeleton key={column} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-xl border-red-400/20 bg-red-400/5">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <AlertCircle
              aria-hidden="true"
              className="size-5 text-red-300"
            />
            <div>
              <h1 className="font-semibold">Project couldn&apos;t be loaded</h1>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={retryLoadingProject}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : project ? (
        <>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderKanban aria-hidden="true" className="size-4" />
                <span>{project.key}</span>
                <span aria-hidden="true">/</span>
                <span>Project</span>
              </div>
              <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">
                {project.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {project.description || "A shared place for your team's work."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <AvatarGroup aria-label={`${project.members.length} project members`}>
                {project.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} aria-label={member.name}>
                    <AvatarFallback
                      className="text-[0.65rem] font-semibold text-white"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? "")
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 5 && (
                  <AvatarGroupCount>
                    +{project.members.length - 5}
                  </AvatarGroupCount>
                )}
              </AvatarGroup>
              <span className="text-sm text-muted-foreground">
                {project.members.length}{" "}
                {project.members.length === 1 ? "member" : "members"}
              </span>
              <NewIssueDialog
                projectId={project.id}
                members={project.members}
                onCreated={() => {
                  if (view === "board") {
                    setBoardRefreshKey((key) => key + 1);
                  } else if (view === "list") {
                    refreshIssueList();
                  }
                }}
              />
            </div>
          </div>

          <nav
            aria-label="Project views"
            className="mt-7 flex gap-1 overflow-x-auto border-b border-border/70"
          >
            {views.map((item) => {
              const params = new URLSearchParams(searchParams.toString());
              if (item.view === "board") {
                params.delete("status");
                params.delete("sort");
                params.delete("page");
              }
              const query = params.toString();
              const href = `/projects/${projectId}${item.href}${
                query ? `?${query}` : ""
              }`;
              const isActive = item.view === view;
              return (
                <Link
                  key={item.view}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm transition-colors ${
                    isActive
                      ? "border-indigo-400 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.view === "board" ? (
                    <CircleDot aria-hidden="true" className="size-4" />
                  ) : item.view === "list" ? (
                    <CheckSquare aria-hidden="true" className="size-4" />
                  ) : (
                    <Settings2 aria-hidden="true" className="size-4" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {(view === "board" || view === "list") && (
            <IssueFilterBar
              filters={filters}
              members={project.members}
              showStatus={view === "list"}
              activeFilterCount={activeFilterCount}
              onChange={updateFilters}
              onClear={clearFilters}
            />
          )}

          {view === "board" && (
            <ProjectBoard
              key={project.id}
              projectId={project.id}
              members={project.members}
              role={project.role}
              refreshKey={boardRefreshKey}
              queryString={boardQuery}
            />
          )}

          {view === "list" && project && (
            <ProjectIssueList
              projectId={project.id}
              members={project.members}
              role={project.role}
              issues={issues}
              isFetching={isIssueListFetching}
              error={currentIssueListError}
              onPageChange={(page) => updateFilters({ page })}
              onRetry={refreshIssueList}
              onClearFilters={clearFilters}
              onChanged={refreshIssueList}
            />
          )}

          {view === "settings" && (
            <ProjectSettingsPanel
              project={project}
              onUpdated={() => {
                void loadProject();
              }}
              onDeleted={() => router.replace("/dashboard")}
            />
          )}

        </>
      ) : null}
    </section>
  );
}
