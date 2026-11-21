"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import type { IssuePriority, IssueStatus, IssueType } from "@/types/domain";

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const types = ["BUG", "FEATURE", "TASK"] as const;
const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
const sortOptions = [
  "newest",
  "oldest",
  "updated",
  "priority",
  "title",
] as const;

const filtersSchema = z.object({
  q: z.string().trim().max(200).catch(""),
  status: z
    .array(z.enum(statuses))
    .transform((values) => [...new Set(values)])
    .catch([]),
  priority: z
    .array(z.enum(priorities))
    .transform((values) => [...new Set(values)])
    .catch([]),
  type: z
    .array(z.enum(types))
    .transform((values) => [...new Set(values)])
    .catch([]),
  assignee: z.string().trim().max(100).catch(""),
  sort: z.enum(sortOptions).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type IssueSort = z.infer<typeof filtersSchema>["sort"];
export type IssueFilters = z.infer<typeof filtersSchema>;
export type IssueFilterUpdates = Partial<IssueFilters>;

const filterParamNames = [
  "q",
  "status",
  "priority",
  "type",
  "assignee",
  "sort",
  "page",
] as const;

function readFilterValues(search: URLSearchParams) {
  const splitValues = (key: string) =>
    search
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

  return {
    q: search.get("q") ?? "",
    status: splitValues("status"),
    priority: splitValues("priority"),
    type: splitValues("type"),
    assignee: search.get("assignee") ?? "",
    sort: search.get("sort") ?? "newest",
    page: search.get("page") ?? "1",
  };
}

function serializeFilters(filters: IssueFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.priority.length) {
    params.set("priority", filters.priority.join(","));
  }
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function toListQuery(filters: IssueFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.priority.length) {
    params.set("priority", filters.priority.join(","));
  }
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.assignee) {
    params.set("assigneeId", filters.assignee);
  }

  const sortBy =
    filters.sort === "newest" || filters.sort === "oldest"
      ? "createdAt"
      : filters.sort === "updated"
        ? "updatedAt"
        : filters.sort;
  params.set("sortBy", sortBy);
  params.set(
    "order",
    filters.sort === "oldest" || filters.sort === "title" ? "asc" : "desc",
  );
  params.set("page", String(filters.page));
  params.set("limit", "20");
  return params.toString();
}

function toBoardQuery(filters: IssueFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.priority.length) {
    params.set("priority", filters.priority.join(","));
  }
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.assignee) params.set("assigneeId", filters.assignee);
  return params.toString();
}

export function useIssueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const pendingSearchString = useRef(searchString);

  useEffect(() => {
    pendingSearchString.current = searchString;
  }, [searchString]);

  const filters = useMemo(() => {
    return filtersSchema.parse(
      readFilterValues(new URLSearchParams(searchString)),
    );
  }, [searchString]);

  const updateFilters = useCallback(
    (updates: IssueFilterUpdates) => {
      const currentParams = new URLSearchParams(pendingSearchString.current);
      const current = filtersSchema.parse(readFilterValues(currentParams));
      const next = { ...current, ...updates };
      const resetsPage =
        Object.keys(updates).some((key) => key !== "page") &&
        updates.page === undefined;
      if (resetsPage) next.page = 1;

      for (const name of filterParamNames) currentParams.delete(name);
      for (const [name, value] of serializeFilters(next)) {
        currentParams.set(name, value);
      }

      const query = currentParams.toString();
      pendingSearchString.current = query;
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const updateSearch = useCallback(
    (value: string) => {
      const currentParams = new URLSearchParams(pendingSearchString.current);
      const queryValue = value.trim();
      currentParams.delete("q");
      currentParams.delete("page");
      if (queryValue) currentParams.set("q", queryValue);

      const query = currentParams.toString();
      pendingSearchString.current = query;
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(pendingSearchString.current);
    for (const name of filterParamNames) params.delete(name);
    const query = params.toString();
    pendingSearchString.current = query;
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router]);

  const activeFilterCount =
    Number(Boolean(filters.q)) +
    filters.status.length +
    filters.priority.length +
    filters.type.length +
    Number(Boolean(filters.assignee)) +
    Number(filters.sort !== "newest");

  const listQuery = useMemo(() => toListQuery(filters), [filters]);
  const boardQuery = useMemo(() => toBoardQuery(filters), [filters]);

  return {
    filters,
    updateFilters,
    updateSearch,
    clearFilters,
    activeFilterCount,
    listQuery,
    boardQuery,
  };
}

export type IssueFilterKey = "status" | "priority" | "type";
export type IssueFilterValue = IssueStatus | IssuePriority | IssueType;
