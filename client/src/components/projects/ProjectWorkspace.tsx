"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarBadge,
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
import { IssueFilterBar } from "@/components/projects/IssueFilterBar";
import { ProjectIssueList } from "@/components/projects/ProjectIssueList";
import { useIssueFilters } from "@/hooks/useIssueFilters";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import type { PresenceUser, SocketEventPayload } from "@/lib/socket";
import { parseIssueEvent } from "@/lib/project-events";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ProjectBoard = dynamic(
  () =>
    import("@/components/projects/ProjectBoard").then(
      (module) => module.ProjectBoard,
    ),
  {
    loading: () => (
      <div
        aria-label="Loading issue board"
        className="mt-6 grid gap-4 md:grid-cols-3"
      >
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    ),
  },
);

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

function matchesListFilters(
  issue: Issue,
  filters: ReturnType<typeof useIssueFilters>["filters"],
  currentUserId: string | undefined,
): boolean {
  if (filters.status.length > 0 && !filters.status.includes(issue.status))
    return false;
  if (filters.priority.length > 0 && !filters.priority.includes(issue.priority))
    return false;
  if (filters.type.length > 0 && !filters.type.includes(issue.type))
    return false;
  if (
    filters.q &&
    !`${issue.key} ${issue.number} ${issue.title} ${issue.description ?? ""}`
      .toLocaleLowerCase()
      .includes(filters.q.toLocaleLowerCase())
  ) {
    return false;
  }
  if (filters.assignee === "unassigned" && issue.assigneeId !== null)
    return false;
  if (filters.assignee === "me" && issue.assigneeId !== currentUserId)
    return false;
  if (
    filters.assignee &&
    filters.assignee !== "me" &&
    filters.assignee !== "unassigned" &&
    issue.assigneeId !== filters.assignee
  ) {
    return false;
  }
  return true;
}

function sortIssues(
  issues: Issue[],
  sort: ReturnType<typeof useIssueFilters>["filters"]["sort"],
): Issue[] {
  const priorityRank: Record<Issue["priority"], number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return [...issues].sort((first, second) => {
    switch (sort) {
      case "newest":
        return second.createdAt.localeCompare(first.createdAt);
      case "oldest":
        return first.createdAt.localeCompare(second.createdAt);
      case "updated":
        return second.updatedAt.localeCompare(first.updatedAt);
      case "priority":
        return priorityRank[second.priority] - priorityRank[first.priority];
      case "title":
        return first.title.localeCompare(second.title);
    }
  });
}

function ProjectPresence({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Viewing
      </span>
      <AvatarGroup
        aria-label={`${users.length} teammates viewing this project`}
      >
        {users.slice(0, 4).map((person) => (
          <Tooltip key={person.id}>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  aria-label={`${person.name} is viewing this project`}
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <span className="relative block">
                <Avatar>
                  <AvatarFallback
                    className="text-[0.65rem] font-semibold text-white"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {person.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("")}
                  </AvatarFallback>
                  <AvatarBadge className="bg-emerald-400 ring-background" />
                </Avatar>
              </span>
            </TooltipTrigger>
            <TooltipContent>{person.name} is viewing</TooltipContent>
          </Tooltip>
        ))}
        {users.length > 4 && (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
            +{users.length - 4}
          </span>
        )}
      </AvatarGroup>
    </div>
  );
}

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
  const [resolvedIssueRequest, setResolvedIssueRequest] = useState<
    string | null
  >(null);
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

  const refreshIssueList = useCallback(() => {
    setIssueListRefreshKey((key) => key + 1);
  }, []);

  const applyRemoteIssue = useCallback(
    (payload: SocketEventPayload, deleted = false) => {
      const issue = parseIssueEvent(payload.entity, projectId);
      if (issue === null) return;

      setIssues((current) => {
        if (current === null) return current;
        const existing = current.items.some((item) => item.id === issue.id);
        const remaining = current.items.filter((item) => item.id !== issue.id);
        if (deleted || !matchesListFilters(issue, filters, user?.id)) {
          return {
            ...current,
            items: remaining,
            total: Math.max(0, current.total - (existing ? 1 : 0)),
          };
        }

        const items = sortIssues([...remaining, issue], filters.sort).slice(
          0,
          current.limit,
        );
        return {
          ...current,
          items,
          total: current.total + (existing ? 0 : 1),
        };
      });

      if (view === "list") refreshIssueList();
    },
    [filters, projectId, refreshIssueList, user?.id, view],
  );
  const handleMemberJoined = useCallback(() => {
    void loadProject();
  }, [loadProject]);
  const handleMemberRemoved = useCallback(
    (payload: SocketEventPayload) => {
      const removedUserId = payload.entity.userId;
      if (removedUserId === user?.id) {
        toast.error("You no longer have access to this project.");
        router.replace("/dashboard");
        return;
      }

      void loadProject();
      setBoardRefreshKey((key) => key + 1);
      if (view === "list") refreshIssueList();
    },
    [loadProject, refreshIssueList, router, user?.id, view],
  );
  const { presenceUsers, isReconnecting } = useProjectSocket(projectId, {
    "issue:created": (payload) => applyRemoteIssue(payload),
    "issue:updated": (payload) => applyRemoteIssue(payload),
    "issue:moved": (payload) => applyRemoteIssue(payload),
    "issue:deleted": (payload) => applyRemoteIssue(payload, true),
    "member:joined": handleMemberJoined,
    "member:removed": handleMemberRemoved,
  });

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
            <AlertCircle aria-hidden="true" className="size-5 text-red-300" />
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
              <AvatarGroup
                aria-label={`${project.members.length} project members`}
              >
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
              <ProjectPresence
                users={presenceUsers.filter((person) => person.id !== user?.id)}
              />
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

          {isReconnecting && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Reconnecting to live updates…
            </p>
          )}

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
