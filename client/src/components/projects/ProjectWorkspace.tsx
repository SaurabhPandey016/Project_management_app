"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckSquare,
  CircleDot,
  FolderKanban,
  Settings2,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { issueTypeIcons, priorityStyles } from "@/lib/constants";
import type {
  Issue,
  IssueStatus,
} from "@/types/domain";
import { Badge } from "@/components/ui/badge";
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

interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  limit: number;
}

type ProjectView = "board" | "list" | "settings";

const views: Array<{ label: string; href: string; view: ProjectView }> = [
  { label: "Board", href: "", view: "board" },
  { label: "List", href: "/list", view: "list" },
  { label: "Settings", href: "/settings", view: "settings" },
];

const statuses: Array<{ value: IssueStatus; label: string; color: string }> = [
  { value: "TODO", label: "To do", color: "bg-slate-400" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-blue-400" },
  { value: "DONE", label: "Done", color: "bg-emerald-400" },
];

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Unable to load this project";
}

function IssueTypeIcon({ type }: { type: Issue["type"] }) {
  const Icon = issueTypeIcons[type];
  return <Icon aria-hidden="true" className="size-3.5 shrink-0" />;
}

export function ProjectWorkspace({
  projectId,
  view,
}: {
  projectId: string;
  view: ProjectView;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectWithMembers | null>(null);
  const [issues, setIssues] = useState<IssueListResponse | null>(null);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(() => {
    return api
      .get<ProjectWithMembers>(`/projects/${projectId}`)
      .then(async (details) => {
        const role =
          details.members.find((member) => member.id === user?.id)?.role ??
          (details.ownerId === user?.id ? "OWNER" : undefined);
        setProject({ ...details, role });
        if (view === "list") {
          setIssues(
            await api.get<IssueListResponse>(`/projects/${projectId}/issues`),
          );
        }
      })
      .catch((requestError: unknown) => setError(messageFor(requestError)))
      .finally(() => setIsLoading(false));
  }, [projectId, user?.id, view]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function retryLoadingProject() {
    setIsLoading(true);
    setError(null);
    void loadProject();
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      {isLoading ? (
        <div aria-label="Loading project" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {statuses.map(({ value }) => (
              <Skeleton key={value} className="h-72 rounded-xl" />
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
                    setIsLoading(true);
                    setError(null);
                    void loadProject();
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
              const href = `/projects/${projectId}${item.href}`;
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

          {view === "board" && (
            <ProjectBoard
              key={project.id}
              projectId={project.id}
              members={project.members}
              refreshKey={boardRefreshKey}
            />
          )}

          {view === "list" && issues && (
            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">All issues</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {issues.total} {issues.total === 1 ? "issue" : "issues"}
                  </p>
                </div>
                <Badge variant="secondary">Page {issues.page}</Badge>
              </div>
              {issues.items.length === 0 ? (
                <Card className="border-dashed border-white/15 bg-card/35">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No issues have been created in this project yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/70">
                  <ul className="divide-y divide-border/70">
                    {issues.items.map((issue) => (
                      <li
                        key={issue.id}
                        className="flex flex-wrap items-center justify-between gap-3 bg-card/35 px-4 py-3.5 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {issue.key}
                          </span>
                          <IssueTypeIcon type={issue.type} />
                          <span className="truncate text-sm font-medium">
                            {issue.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {issue.status.replace("_", " ").toLowerCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={priorityStyles[issue.priority]}
                          >
                            {issue.priority.toLowerCase()}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
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
