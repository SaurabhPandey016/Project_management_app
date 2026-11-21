"use client";

import { useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  AlertCircle,
  GripVertical,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBoard } from "@/hooks/useBoard";
import { issueTypeIcons, priorityStyles } from "@/lib/constants";
import type { Issue, IssueStatus } from "@/types/domain";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";
import { NewIssueDialog } from "@/components/projects/NewIssueDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statuses: Array<{
  value: IssueStatus;
  label: string;
  color: string;
  dot: string;
}> = [
  {
    value: "TODO",
    label: "To Do",
    color: "text-slate-300",
    dot: "bg-slate-400",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    color: "text-blue-300",
    dot: "bg-blue-400",
  },
  {
    value: "DONE",
    label: "Done",
    color: "text-emerald-300",
    dot: "bg-emerald-400",
  },
];

const statusLabels: Record<IssueStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function getIssueStatus(value: string): IssueStatus | null {
  return statuses.find((status) => status.value === value)?.value ?? null;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function IssueTypeIcon({ issue }: { issue: Issue }) {
  const Icon = issueTypeIcons[issue.type];
  return <Icon aria-hidden="true" className="size-3.5 shrink-0" />;
}

function IssuePreview({
  issue,
  open,
  onOpenChange,
}: {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {issue && (
          <>
            <SheetHeader className="border-b border-border/70 pr-14">
              <SheetDescription className="flex items-center gap-2">
                <IssueTypeIcon issue={issue} />
                {issue.key}
              </SheetDescription>
              <SheetTitle className="text-xl">{issue.title}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{statusLabels[issue.status]}</Badge>
                <Badge
                  variant="outline"
                  className={priorityStyles[issue.priority]}
                >
                  {issue.priority.toLowerCase()}
                </Badge>
                <Badge variant="secondary">{issue.type.toLowerCase()}</Badge>
              </div>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {issue.description || "No description provided."}
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Assignee</h3>
                <p className="text-sm text-muted-foreground">
                  {issue.assignee?.name ?? "Unassigned"}
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BoardSkeleton() {
  return (
    <div
      aria-label="Loading issue board"
      aria-live="polite"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible"
    >
      {statuses.map(({ value }) => (
        <div key={value} className="min-w-[280px] snap-start md:min-w-0">
          <Skeleton className="mb-3 h-6 w-32" />
          <div className="space-y-3 rounded-xl border border-border/70 bg-card/35 p-3">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectBoard({
  projectId,
  members,
  refreshKey,
}: {
  projectId: string;
  members: ProjectMember[];
  refreshKey: number;
}) {
  const { board, isLoading, error, retry, moveIssue, movingIssueIds } =
    useBoard(projectId, refreshKey);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (
      result.source.droppableId === result.destination.droppableId &&
      result.source.index === result.destination.index
    ) {
      return;
    }
    const status = getIssueStatus(result.destination.droppableId);
    if (status === null) return;
    void moveIssue(
      result.draggableId,
      status,
      result.destination.index,
    );
  }

  if (isLoading && board === null) return <BoardSkeleton />;

  if (board === null) {
    return (
      <Card className="mt-6 border-red-400/20 bg-red-400/5">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <AlertCircle aria-hidden="true" className="size-5 text-red-300" />
          <div>
            <h2 className="font-semibold">Board couldn&apos;t be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "The board is unavailable right now."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void retry()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible">
          {statuses.map(({ value, label, color, dot }) => (
            <section
              key={value}
              aria-labelledby={`board-status-${value}`}
              className="min-w-[280px] snap-start md:min-w-0"
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <h2
                  id={`board-status-${value}`}
                  className={`flex items-center gap-2 text-sm font-semibold ${color}`}
                >
                  <span className={`size-2 rounded-full ${dot}`} />
                  {label}
                </h2>
                <span
                  aria-label={`${board[value].length} ${label} issues`}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {board[value].length}
                </span>
              </div>
              {value === "TODO" && (
                <div className="mb-2">
                  <NewIssueDialog
                    projectId={projectId}
                    members={members}
                    buttonLabel="Add issue"
                    onCreated={() => void retry()}
                  />
                </div>
              )}
              <Droppable droppableId={value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label={`${label} issues`}
                    className={`max-h-[calc(100vh-19rem)] min-h-40 space-y-2.5 overflow-y-auto rounded-xl border p-2.5 transition-colors ${
                      snapshot.isDraggingOver
                        ? "border-indigo-400/50 bg-indigo-400/5"
                        : "border-border/70 bg-card/35"
                    }`}
                  >
                    {board[value].map((issue, index) => (
                      <Draggable
                        key={issue.id}
                        draggableId={issue.id}
                        index={index}
                        isDragDisabled={movingIssueIds.has(issue.id)}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`transition-shadow ${
                              dragSnapshot.isDragging
                                ? "z-10 rotate-1 shadow-xl"
                                : "hover:-translate-y-0.5"
                            }`}
                          >
                            <Card className="border-border/70 bg-background/90 shadow-sm transition-colors hover:border-indigo-400/30">
                              <CardContent className="space-y-3 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedIssue(issue)}
                                    aria-label={`Open ${issue.key}: ${issue.title}`}
                                    className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <IssueTypeIcon issue={issue} />
                                      {issue.key}
                                    </span>
                                    <span className="mt-2 line-clamp-2 block text-sm font-medium leading-5 text-foreground">
                                      {issue.title}
                                    </span>
                                  </button>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className={priorityStyles[issue.priority]}
                                    >
                                      {issue.priority.toLowerCase()}
                                    </Badge>
                                    <button
                                      type="button"
                                      {...dragProvided.dragHandleProps}
                                      aria-label={`Drag ${issue.key}`}
                                      className="inline-flex size-7 touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                                    >
                                      <GripVertical
                                        aria-hidden="true"
                                        className="size-4"
                                      />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {issue.assignee ? (
                                      <Tooltip>
                                        <TooltipTrigger
                                          render={
                                            <span
                                              tabIndex={0}
                                              aria-label={`Assigned to ${issue.assignee.name}`}
                                              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            />
                                          }
                                        >
                                          <Avatar size="sm">
                                            <AvatarFallback
                                              className="text-[0.6rem] font-semibold text-white"
                                              style={{
                                                backgroundColor:
                                                  issue.assignee.avatarColor,
                                              }}
                                            >
                                              {initials(issue.assignee.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {issue.assignee.name}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Unassigned
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      <MessageCircle
                                        aria-hidden="true"
                                        className="size-3.5"
                                      />
                                      {issue.commentCount ?? 0}
                                      <span className="sr-only">
                                        comments
                                      </span>
                                    </span>
                                  </div>
                                  <Select
                                    value={issue.status}
                                    onValueChange={(nextStatus) => {
                                      if (nextStatus === null) return;
                                      const status = getIssueStatus(nextStatus);
                                      if (status === null) return;
                                      void moveIssue(
                                        issue.id,
                                        status,
                                        board[status].length,
                                      );
                                    }}
                                    disabled={movingIssueIds.has(issue.id)}
                                  >
                                    <SelectTrigger
                                      size="sm"
                                      aria-label={`Change ${issue.key} status`}
                                      className="max-w-32"
                                    >
                                      <SelectValue>
                                        {statusLabels[issue.status]}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statuses.map((status) => (
                                        <SelectItem
                                          key={status.value}
                                          value={status.value}
                                        >
                                          {status.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {board[value].length === 0 && (
                      <p className="px-2 py-7 text-center text-xs text-muted-foreground">
                        Drop an issue here or move one in.
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </section>
          ))}
        </div>
      </DragDropContext>
      <IssuePreview
        issue={selectedIssue}
        open={selectedIssue !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIssue(null);
        }}
      />
    </>
  );
}
