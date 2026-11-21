"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FolderKanban,
  UsersRound,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { Project } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Unable to load projects";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    return api
      .get<Project[]>("/projects")
      .then(setProjects)
      .catch((requestError: unknown) =>
        setError(getErrorMessage(requestError)),
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function retryLoadingProjects() {
    setIsLoading(true);
    setError(null);
    void loadProjects();
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-300">Your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {user ? `Welcome, ${user.name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Pick up where your team left off.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects you&apos;re a member of.
          </p>
        </div>
        {!isLoading && !error && projects.length > 0 && (
          <Badge variant="secondary">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div
          aria-label="Loading projects"
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-xl" />
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
                <p className="font-medium">Projects couldn&apos;t be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={retryLoadingProjects}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="mt-5 border-dashed border-white/15 bg-card/35">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
              <FolderKanban aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">No projects yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              When you create a project or accept an invitation, it will show
              up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
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
                <CardContent className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersRound aria-hidden="true" className="size-3.5" />
                      {project.memberCount ?? 0}
                    </span>
                    <span>
                      {project.openIssueCount ?? 0} open{" "}
                      {(project.openIssueCount ?? 0) === 1 ? "issue" : "issues"}
                    </span>
                    {project.role && (
                      <Badge variant="secondary" className="text-[0.65rem]">
                        {project.role.toLowerCase()}
                      </Badge>
                    )}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
