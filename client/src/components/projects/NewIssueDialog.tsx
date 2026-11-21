"use client";

import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Issue, IssuePriority, IssueType } from "@/types/domain";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";
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
import { Label } from "@/components/ui/label";

export function NewIssueDialog({
  projectId,
  members,
  onCreated,
  buttonLabel = "New issue",
}: {
  projectId: string;
  members: ProjectMember[];
  onCreated: () => void;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>("TASK");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post<Issue>(`/projects/${projectId}/issues`, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        ...(assigneeId ? { assigneeId } : {}),
      });
      toast.success("Issue created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setType("TASK");
      setPriority("MEDIUM");
      setAssigneeId("");
      onCreated();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to create issue"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) setOpen(nextOpen);
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {buttonLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an issue</DialogTitle>
          <DialogDescription>
            Add a piece of work to this project&apos;s To do column.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void createIssue(event)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-issue-title">Title</Label>
            <Input
              id="new-issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              autoFocus
              disabled={isSubmitting}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-issue-description">Description (optional)</Label>
            <textarea
              id="new-issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-issue-type">Type</Label>
              <select
                id="new-issue-type"
                value={type}
                onChange={(event) => setType(event.target.value as IssueType)}
                disabled={isSubmitting}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature</option>
                <option value="TASK">Task</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-issue-priority">Priority</Label>
              <select
                id="new-issue-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as IssuePriority)
                }
                disabled={isSubmitting}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-issue-assignee">Assignee (optional)</Label>
            <select
              id="new-issue-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {isSubmitting ? "Creating…" : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
