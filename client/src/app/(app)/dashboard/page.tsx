"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FolderKanban,
  LoaderCircle,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Issue, Project, ProjectRole, User } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusGate } from "@/components/common/StatusGate";

interface ProjectDetails extends Project {
  members: Array<User & { role: ProjectRole }>;
}

interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  limit: number;
}

interface ProjectActivity extends Project {
  lastActivityAt: string;
  memberPreview: Array<User & { role: ProjectRole }>;
}

interface DashboardData {
  projects: ProjectActivity[];
  assignedOpenCount: number;
  criticalOpenCount: number;
}

function suggestedKey(name: string): string {
  const words = name
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const initials = words.map((word) => word[0]).join("");
  const key = (initials.length >= 2 ? initials : words.join("")).replace(
    /[^A-Z]/g,
    "",
  );
  return key.slice(0, 5).padEnd(2, "X");
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatActivity(date: string): string {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Activity unavailable";
  return `Updated ${formatDistanceToNow(parsedDate, { addSuffix: true })}`;
}

function getErrorMessage(error: unknown): string {
  return getFriendlyErrorMessage(error, "Unable to load your dashboard");
}

function ProjectCreateDialog({
  onCreated,
}: {
  onCreated: (project: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateName(value: string) {
    setName(value);
    if (!keyEdited) setKey(suggestedKey(value));
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedKey = key.trim().toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(normalizedKey)) {
      setError("Use 2–5 uppercase letters for the project key.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const project = await api.post<Project>("/projects", {
        name: name.trim(),
        key: normalizedKey,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success("Project created");
      onCreated(project);
      setOpen(false);
      setName("");
      setKey("");
      setKeyEdited(false);
      setDescription("");
    } catch (requestError) {
      const message =
        requestError instanceof ApiError && requestError.status === 409
          ? "That project key is already in use. Choose another."
          : getFriendlyErrorMessage(requestError, "Unable to create project");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        Create project
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>
            Set up a shared workspace for your team&apos;s work.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void createProject(event)}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="create-project-name">Project name</Label>
            <Input
              id="create-project-name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Website Revamp"
              maxLength={100}
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-project-key">Project key</Label>
            <Input
              id="create-project-key"
              value={key}
              onChange={(event) => {
                setKeyEdited(true);
                setKey(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 5),
                );
              }}
              placeholder="WEB"
              minLength={2}
              maxLength={5}
              required
              aria-invalid={Boolean(error)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              2–5 letters. Issue keys will look like {key || "WEB"}-1.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-project-description">
              Description (optional)
            </Label>
            <textarea
              id="create-project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              placeholder="What is this project about?"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const projects = await api.get<Project[]>("/projects");
      const perProject = await Promise.all(
        projects.map(async (project) => {
          const [details, assigned, critical, latestActivity] =
            await Promise.all([
              api.get<ProjectDetails>(`/projects/${project.id}`),
              api.get<IssueListResponse>(
                `/projects/${project.id}/issues?assigneeId=me&status=TODO,IN_PROGRESS&limit=100`,
              ),
              api.get<IssueListResponse>(
                `/projects/${project.id}/issues?priority=CRITICAL&limit=100`,
              ),
              api.get<IssueListResponse>(
                `/projects/${project.id}/issues?sortBy=updatedAt&order=desc&limit=1`,
              ),
            ]);
          return {
            project: {
              ...project,
              lastActivityAt:
                latestActivity.items[0]?.updatedAt ?? project.updatedAt,
              memberPreview: details.members.slice(0, 4),
            },
            assignedOpenCount: assigned.total,
            criticalOpenCount: critical.total,
          };
        }),
      );

      setDashboard({
        projects: perProject.map((item) => item.project),
        assignedOpenCount: perProject.reduce(
          (total, item) => total + item.assignedOpenCount,
          0,
        ),
        criticalOpenCount: perProject.reduce(
          (total, item) => total + item.criticalOpenCount,
          0,
        ),
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(loadId);
  }, [loadDashboard]);

  async function retryLoadingDashboard() {
    setIsLoading(true);
    await loadDashboard();
  }

  function addCreatedProject(project: Project) {
    setDashboard((current) =>
      current === null
        ? {
            projects: [
              {
                ...project,
                role: "OWNER",
                memberCount: 1,
                openIssueCount: 0,
                lastActivityAt: project.updatedAt,
                memberPreview: user ? [{ ...user, role: "OWNER" }] : [],
              },
            ],
            assignedOpenCount: 0,
            criticalOpenCount: 0,
          }
        : {
            ...current,
            projects: [
              {
                ...project,
                role: "OWNER",
                memberCount: 1,
                openIssueCount: 0,
                lastActivityAt: project.updatedAt,
                memberPreview: user ? [{ ...user, role: "OWNER" }] : [],
              },
              ...current.projects,
            ],
          },
    );
  }

  const statCards = useMemo(
    () => [
      {
        label: "Projects",
        value: dashboard?.projects.length ?? 0,
        icon: FolderKanban,
        description: "Workspaces you belong to",
        tone: "text-indigo-300 bg-indigo-400/10",
      },
      {
        label: "Open issues assigned to me",
        value: dashboard?.assignedOpenCount ?? 0,
        icon: Check,
        description: "Ready for your attention",
        tone: "text-blue-300 bg-blue-400/10",
      },
      {
        label: "Critical issues",
        value: dashboard?.criticalOpenCount ?? 0,
        icon: Sparkles,
        description: "Highest-priority work across your projects",
        tone: "text-rose-300 bg-rose-400/10",
      },
    ],
    [dashboard],
  );

  return (
    <section className="mx-auto w-full max-w-6xl">
      <StatusGate>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-300">
              Your workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {user ? `Welcome, ${user.name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pick up where your team left off.
            </p>
          </div>
          <ProjectCreateDialog onCreated={addCreatedProject} />
        </div>

        {isLoading ? (
          <div
            aria-label="Loading dashboard"
            className="mt-7 grid gap-4 sm:grid-cols-3"
          >
            {statCards.map((card) => (
              <Skeleton key={card.label} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : !error && dashboard ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {statCards.map(
              ({ label, value, icon: Icon, description, tone }) => (
                <Card key={label} className="border-white/8 bg-card/55">
                  <CardContent className="flex items-start justify-between gap-3 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums">
                        {value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        ) : null}

        <div className="mt-9 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">My projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Project spaces for the work you&apos;re part of.
            </p>
          </div>
          {!isLoading && !error && dashboard && (
            <Badge variant="secondary">
              {dashboard.projects.length}{" "}
              {dashboard.projects.length === 1 ? "project" : "projects"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div
            aria-label="Loading projects"
            className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="mt-5 border-red-400/20 bg-red-400/5">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-red-300"
                />
                <div>
                  <p className="font-medium">
                    Dashboard couldn&apos;t be loaded
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void retryLoadingDashboard()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : dashboard?.projects.length === 0 ? (
          <Card className="mt-5 border-dashed border-white/15 bg-card/35">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                <FolderKanban aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">
                Your next project starts here
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Create a workspace to bring issues and teammates together, or
                accept an invitation to join an existing project.
              </p>
              <div className="mt-5">
                <ProjectCreateDialog onCreated={addCreatedProject} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard?.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full border-white/8 bg-card/60 transition-all group-hover:-translate-y-0.5 group-hover:border-indigo-400/30 group-hover:bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                        <FolderKanban aria-hidden="true" className="size-5" />
                      </span>
                      <Badge variant="outline">{project.key}</Badge>
                    </div>
                    <CardTitle className="pt-2">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-10">
                      {project.description || "No project description yet."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <AvatarGroup
                        aria-label={`${project.memberCount ?? 0} project members`}
                      >
                        {project.memberPreview.map((member) => (
                          <Avatar key={member.id} aria-label={member.name}>
                            <AvatarFallback
                              className="text-[0.65rem] font-semibold text-white"
                              style={{ backgroundColor: member.avatarColor }}
                            >
                              {initials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(project.memberCount ?? 0) >
                          project.memberPreview.length && (
                          <AvatarGroupCount>
                            +
                            {(project.memberCount ?? 0) -
                              project.memberPreview.length}
                          </AvatarGroupCount>
                        )}
                      </AvatarGroup>
                      {project.role && (
                        <Badge variant="secondary" className="text-[0.65rem]">
                          {project.role.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <UsersRound aria-hidden="true" className="size-3.5" />
                        {project.memberCount ?? 0} members
                      </span>
                      <span>
                        {project.openIssueCount ?? 0} open{" "}
                        {(project.openIssueCount ?? 0) === 1
                          ? "issue"
                          : "issues"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {formatActivity(project.lastActivityAt)}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </StatusGate>
    </section>
  );
}
