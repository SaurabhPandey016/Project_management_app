"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueComments } from "@/components/projects/IssueComments";
import { IssueFormDialog } from "@/components/projects/IssueFormDialog";
import { ApiError, api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import { issueTypeIcons, priorityStyles } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import type { SocketEventPayload } from "@/lib/socket";
import { parseIssueEvent } from "@/lib/project-events";
import type {
  Issue,
  IssuePriority,
  IssueStatus,
  IssueType,
  ProjectRole,
} from "@/types/domain";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";

const statuses: Array<{ value: IssueStatus; label: string }> = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const issueTypes: Record<IssueType, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  TASK: "Task",
};

const priorities: Record<IssuePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

interface IssueMoveResponse {
  issue: Issue;
  rebalanced: boolean;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string): string {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function isIssueStatus(value: string): value is IssueStatus {
  return statuses.some((status) => status.value === value);
}

function isUnavailableError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 403 || error.status === 404)
  );
}

export function IssueDrawer({
  projectId,
  issueId,
  role,
  members,
  onClose,
  onChanged,
}: {
  projectId: string;
  issueId: string;
  role: ProjectRole | undefined;
  members: ProjectMember[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const receivedRemoteIssueRef = useRef(false);

  const closeForUnavailableIssue = useCallback(
    (error: unknown) => {
      toast.error(
        error instanceof ApiError && error.status === 403
          ? "You no longer have access to this issue."
          : "This issue is no longer available.",
      );
      onClose();
    },
    [onClose],
  );

  const updateCommentCount = useCallback((commentCount: number) => {
    setIssue((current) =>
      current === null ? null : { ...current, commentCount },
    );
  }, []);
  const applyRemoteIssue = useCallback(
    (payload: SocketEventPayload) => {
      const updated = parseIssueEvent(payload.entity, projectId);
      if (updated === null || updated.id !== issueId) return;
      receivedRemoteIssueRef.current = true;
      setIssue((current) =>
        current === null
          ? updated
          : { ...updated, commentCount: current.commentCount },
      );
    },
    [issueId, projectId],
  );
  const handleRemoteDelete = useCallback(
    (payload: SocketEventPayload) => {
      if (payload.entity.id !== issueId) return;
      toast.error("This issue was deleted by another teammate.");
      onClose();
    },
    [issueId, onClose],
  );

  useProjectSocket(projectId, {
    "issue:updated": applyRemoteIssue,
    "issue:moved": applyRemoteIssue,
    "issue:deleted": handleRemoteDelete,
  });

  useEffect(() => {
    let active = true;
    api
      .get<Issue>(`/projects/${projectId}/issues/${issueId}`)
      .then((result) => {
        if (active) {
          setIssue((current) =>
            receivedRemoteIssueRef.current ? (current ?? result) : result,
          );
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (isUnavailableError(error)) {
          closeForUnavailableIssue(error);
          return;
        }
        setLoadError(
          getFriendlyErrorMessage(error, "Unable to load this issue"),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [closeForUnavailableIssue, issueId, projectId]);

  const isAdmin = role === "OWNER" || role === "ADMIN";
  const canEdit =
    issue !== null &&
    (isAdmin || issue.reporterId === user?.id || issue.assigneeId === user?.id);
  const canDelete =
    issue !== null && (isAdmin || issue.reporterId === user?.id);
  const TypeIcon = issue ? issueTypeIcons[issue.type] : null;

  async function changeStatus(value: string | null) {
    if (issue === null || value === null || !isIssueStatus(value)) return;
    if (value === issue.status || isMoving) return;

    setIsMoving(true);
    try {
      const result = await api.patch<IssueMoveResponse>(
        `/projects/${projectId}/issues/${issue.id}/move`,
        { status: value },
      );
      setIssue((current) =>
        current === null
          ? result.issue
          : { ...result.issue, commentCount: current.commentCount },
      );
      onChanged();
    } catch (error) {
      if (isUnavailableError(error)) {
        closeForUnavailableIssue(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to update status"));
      }
    } finally {
      setIsMoving(false);
    }
  }

  async function saveTitle() {
    const title = titleDraft.trim();
    if (issue === null || !title || title.length > 120 || isSavingTitle) return;
    if (title === issue.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      const updated = await api.patch<Issue>(
        `/projects/${projectId}/issues/${issue.id}`,
        { title },
      );
      setIssue({ ...updated, commentCount: issue.commentCount });
      setIsEditingTitle(false);
      toast.success("Issue title updated");
      onChanged();
    } catch (error) {
      if (isUnavailableError(error)) {
        closeForUnavailableIssue(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to update title"));
      }
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function confirmDeleteIssue() {
    if (issue === null || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete<void>(`/projects/${projectId}/issues/${issue.id}`);
      toast.success("Issue deleted");
      setDeleteDialogOpen(false);
      onChanged();
      onClose();
    } catch (error) {
      setDeleteDialogOpen(false);
      if (isUnavailableError(error)) {
        closeForUnavailableIssue(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to delete issue"));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent className="flex h-full w-full max-w-none flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full sm:max-w-2xl">
          {isLoading ? (
            <div aria-label="Loading issue details" className="space-y-5 p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : loadError || issue === null ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 p-6">
              <AlertCircle aria-hidden="true" className="size-5 text-red-300" />
              <div>
                <SheetTitle>Issue couldn&apos;t be loaded</SheetTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  {loadError ?? "This issue is no longer available."}
                </p>
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <SheetHeader className="shrink-0 border-b border-border/70 pr-14">
                <SheetDescription className="flex items-center gap-2">
                  {TypeIcon && (
                    <TypeIcon aria-hidden="true" className="size-4" />
                  )}
                  <span>{issue.key}</span>
                  <span aria-hidden="true">·</span>
                  <span>{issueTypes[issue.type]}</span>
                </SheetDescription>
                {isEditingTitle && canEdit ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveTitle();
                    }}
                  >
                    <Input
                      aria-label="Issue title"
                      autoFocus
                      maxLength={120}
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      disabled={isSavingTitle}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Save issue title"
                      disabled={isSavingTitle || !titleDraft.trim()}
                    >
                      {isSavingTitle ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin"
                        />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Cancel title edit"
                      disabled={isSavingTitle}
                      onClick={() => setIsEditingTitle(false)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-start gap-2">
                    <SheetTitle className="min-w-0 flex-1 text-xl leading-7">
                      {issue.title}
                    </SheetTitle>
                    {canEdit && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Edit issue title"
                        onClick={() => {
                          setTitleDraft(issue.title);
                          setIsEditingTitle(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                )}
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <label
                        htmlFor="issue-detail-status"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Status
                      </label>
                      <Select
                        value={issue.status}
                        onValueChange={(value) => void changeStatus(value)}
                        disabled={isMoving}
                      >
                        <SelectTrigger id="issue-detail-status">
                          <SelectValue>
                            {statuses.find(
                              (status) => status.value === issue.status,
                            )?.label ?? issue.status}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Priority
                      </span>
                      <Badge
                        variant="outline"
                        className={`h-8 w-fit ${priorityStyles[issue.priority]}`}
                      >
                        {priorities[issue.priority]}
                      </Badge>
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Type
                      </span>
                      <Badge variant="secondary" className="h-8 w-fit">
                        {issueTypes[issue.type]}
                      </Badge>
                    </div>
                    <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Assignee
                      </span>
                      <PersonSummary
                        name={issue.assignee?.name ?? "Unassigned"}
                        avatarColor={issue.assignee?.avatarColor}
                      />
                    </div>
                    <div className="col-span-2 grid gap-1.5 sm:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Reporter
                      </span>
                      <PersonSummary
                        name={issue.reporter.name}
                        avatarColor={issue.reporter.avatarColor}
                      />
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {canEdit && (
                      <IssueFormDialog
                        projectId={projectId}
                        members={members}
                        issue={issue}
                        onUnavailable={closeForUnavailableIssue}
                        onSaved={(updated) => {
                          setIssue({
                            ...updated,
                            commentCount: issue.commentCount,
                          });
                          onChanged();
                        }}
                      />
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <section aria-labelledby="issue-description-heading">
                  <h3
                    id="issue-description-heading"
                    className="text-sm font-semibold"
                  >
                    Description
                  </h3>
                  <p className="mt-2 min-h-12 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {issue.description || "No description provided."}
                  </p>
                </section>

                <div className="grid gap-2 border-y border-border/70 py-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created{" "}
                    <time dateTime={issue.createdAt}>
                      {formatDate(issue.createdAt)}
                    </time>
                  </p>
                  <p>
                    Updated{" "}
                    <time dateTime={issue.updatedAt}>
                      {formatDate(issue.updatedAt)}
                    </time>
                  </p>
                </div>

                <IssueComments
                  key={issue.id}
                  projectId={projectId}
                  issueId={issue.id}
                  currentUser={user}
                  role={role}
                  onUnavailable={closeForUnavailableIssue}
                  onChanged={updateCommentCount}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {issue?.key}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the issue and its comment thread. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDeleteIssue()}
            >
              {isDeleting && (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              )}
              Delete issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PersonSummary({
  name,
  avatarColor,
}: {
  name: string;
  avatarColor: string | undefined;
}) {
  if (!avatarColor) {
    return <span className="truncate text-sm">{name}</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback
          className="text-[0.6rem] font-semibold text-white"
          style={{ backgroundColor: avatarColor }}
        >
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm">{name}</span>
    </span>
  );
}
