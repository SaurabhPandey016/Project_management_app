"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  IssueFilterUpdates,
  IssueFilters,
  IssueSort,
} from "@/hooks/useIssueFilters";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";
import type { IssuePriority, IssueStatus, IssueType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const priorityOptions: Array<{ value: IssuePriority; label: string }> = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const typeOptions: Array<{ value: IssueType; label: string }> = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE", label: "Feature" },
  { value: "TASK", label: "Task" },
];

const statusOptions: Array<{ value: IssueStatus; label: string }> = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
];

const sortOptions: Array<{ value: IssueSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "priority", label: "Priority high to low" },
  { value: "title", label: "Title A-Z" },
];

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const debouncedDraft = useDebounce(draft, 300);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (debouncedDraft !== value) onChangeRef.current(debouncedDraft.trim());
  }, [debouncedDraft, value]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search issues"
        value={draft}
        maxLength={200}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search issues…"
        className="pl-9"
      />
    </div>
  );
}

function MultiSelectFilter<TValue extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ value: TValue; label: string }>;
  selected: TValue[];
  onToggle: (value: TValue) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${label} filter`}
          />
        }
      >
        {label}
        {selected.length > 0 && (
          <Badge variant="secondary">{selected.length}</Badge>
        )}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          Filter by {label.toLowerCase()}
        </p>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(option.value)}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-4 items-center justify-center rounded border border-border">
                {isSelected && <Check aria-hidden="true" className="size-3" />}
              </span>
              {option.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function AssigneeFilter({
  members,
  selected,
  onChange,
}: {
  members: ProjectMember[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedMember = members.find((member) => member.id === selected);
  const label =
    selected === "me"
      ? "Me"
      : selected === "unassigned"
        ? "Unassigned"
        : (selectedMember?.name ?? "Assignee");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Assignee filter"
          />
        }
      >
        {label}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        {[
          { value: "", label: "Any assignee" },
          { value: "me", label: "Me" },
          { value: "unassigned", label: "Unassigned" },
          ...members.map((member) => ({
            value: member.id,
            label: member.name,
          })),
        ].map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value || "any"}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-4 items-center justify-center">
                {isSelected && <Check aria-hidden="true" className="size-4" />}
              </span>
              {option.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function FilterControls({
  filters,
  members,
  showStatus,
  onChange,
}: {
  filters: IssueFilters;
  members: ProjectMember[];
  showStatus: boolean;
  onChange: (updates: IssueFilterUpdates) => void;
}) {
  function toggle<TValue extends IssueStatus | IssuePriority | IssueType>(
    key: "status" | "priority" | "type",
    current: TValue[],
    value: TValue,
  ) {
    onChange({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  }

  return (
    <>
      {showStatus && (
        <MultiSelectFilter
          label="Status"
          options={statusOptions}
          selected={filters.status}
          onToggle={(value) => toggle("status", filters.status, value)}
        />
      )}
      <MultiSelectFilter
        label="Priority"
        options={priorityOptions}
        selected={filters.priority}
        onToggle={(value) => toggle("priority", filters.priority, value)}
      />
      <MultiSelectFilter
        label="Type"
        options={typeOptions}
        selected={filters.type}
        onToggle={(value) => toggle("type", filters.type, value)}
      />
      <AssigneeFilter
        members={members}
        selected={filters.assignee}
        onChange={(assignee) => onChange({ assignee })}
      />
      {showStatus && (
        <Select
          value={filters.sort}
          onValueChange={(sort) => {
            if (
              sort === "newest" ||
              sort === "oldest" ||
              sort === "updated" ||
              sort === "priority" ||
              sort === "title"
            ) {
              onChange({ sort });
            }
          }}
        >
          <SelectTrigger aria-label="Sort issues" size="sm" className="w-44">
            <SelectValue>
              {
                sortOptions.find((option) => option.value === filters.sort)
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}

export function IssueFilterBar({
  filters,
  members,
  showStatus = false,
  activeFilterCount,
  onChange,
  onClear,
}: {
  filters: IssueFilters;
  members: ProjectMember[];
  showStatus?: boolean;
  activeFilterCount: number;
  onChange: (updates: IssueFilterUpdates) => void;
  onClear: () => void;
}) {
  const controls = (
    <FilterControls
      filters={filters}
      members={members}
      showStatus={showStatus}
      onChange={onChange}
    />
  );

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <SearchInput
        key={filters.q}
        value={filters.q}
        onChange={(q) => onChange({ q })}
      />
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {controls}
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="md:hidden"
              aria-label={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
            />
          }
        >
          <Filter aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto"
        >
          <div className="flex flex-col items-stretch gap-2">{controls}</div>
        </PopoverContent>
      </Popover>
      {activeFilterCount > 0 && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden="true" />
          Clear filters
          <Badge variant="secondary">{activeFilterCount}</Badge>
        </Button>
      )}
    </div>
  );
}
