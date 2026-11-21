"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Issue } from "@/types/domain";
import type { ProjectMember } from "@/components/projects/ProjectSettingsPanel";

const issueFormSchema = z.object({
  title: z.string().trim().min(1, "Enter an issue title").max(120),
  description: z.string().max(20_000),
  type: z.enum(["BUG", "FEATURE", "TASK"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assigneeId: z.string(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

interface IssueFormDialogProps {
  projectId: string;
  members: ProjectMember[];
  issue?: Issue;
  buttonLabel?: string;
  onSaved: (issue: Issue) => void;
  onUnavailable?: (error: unknown) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapServerValidationError(
  error: unknown,
  setError: ReturnType<
    typeof useForm<IssueFormValues>
  >["setError"],
): string {
  if (!(error instanceof ApiError)) {
    return getFriendlyErrorMessage(error, "Unable to save this issue");
  }

  if (Array.isArray(error.details)) {
    for (const detail of error.details) {
      if (
        typeof detail !== "object" ||
        detail === null ||
        !("path" in detail) ||
        typeof detail.path !== "string" ||
        !("message" in detail) ||
        typeof detail.message !== "string"
      ) {
        continue;
      }

      if (
        detail.path === "title" ||
        detail.path === "description" ||
        detail.path === "type" ||
        detail.path === "priority" ||
        detail.path === "assigneeId"
      ) {
        setError(detail.path, {
          type: "server",
          message: detail.message,
        });
      }
    }
  }

  if (error.code === "INVALID_ASSIGNEE") {
    setError("assigneeId", {
      type: "server",
      message: "Choose a member of this project",
    });
    return "The selected assignee is no longer a project member.";
  }

  return getFriendlyErrorMessage(error, "Unable to save this issue");
}

function assigneeLabel(
  assigneeId: string,
  members: ProjectMember[],
): string {
  if (!assigneeId) return "Unassigned";
  return members.find((member) => member.id === assigneeId)?.name ?? "Unassigned";
}

export function IssueFormDialog({
  projectId,
  members,
  issue,
  buttonLabel,
  onSaved,
  onUnavailable,
}: IssueFormDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "TASK",
      priority: "MEDIUM",
      assigneeId: "",
    },
  });
  const isEditing = issue !== undefined;
  const isSubmitting = form.formState.isSubmitting;
  const description = useWatch({
    control: form.control,
    name: "description",
  });
  const typeValue = useWatch({ control: form.control, name: "type" });
  const priorityValue = useWatch({ control: form.control, name: "priority" });
  const assigneeId = useWatch({ control: form.control, name: "assigneeId" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: issue?.title ?? "",
      description: issue?.description ?? "",
      type: issue?.type ?? "TASK",
      priority: issue?.priority ?? "MEDIUM",
      assigneeId: issue?.assigneeId ?? "",
    });
  }, [form, issue, open]);

  async function submit(values: IssueFormValues) {
    form.clearErrors("root.server");
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || (isEditing ? null : undefined),
        type: values.type,
        priority: values.priority,
        assigneeId: values.assigneeId || (isEditing ? null : undefined),
      };
      const savedIssue = isEditing
        ? await api.patch<Issue>(
            `/projects/${projectId}/issues/${issue.id}`,
            payload,
          )
        : await api.post<Issue>(`/projects/${projectId}/issues`, payload);

      toast.success(isEditing ? "Issue updated" : "Issue created");
      setOpen(false);
      onSaved(savedIssue);
    } catch (error) {
      if (
        isEditing &&
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404) &&
        onUnavailable
      ) {
        onUnavailable(error);
        return;
      }
      const message = mapServerValidationError(error, form.setError);
      form.setError("root.server", { type: "server", message });
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) setOpen(nextOpen);
      }}
    >
      <Button
        type="button"
        variant={isEditing ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        {isEditing ? (
          <Pencil aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        {buttonLabel ?? (isEditing ? "Edit issue" : "New issue")}
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit issue" : "Create an issue"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update ${issue.key} and keep the project up to date.`
              : "Add a piece of work to this project's To Do column."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4"
            noValidate
          >
            <FormItem>
              <FormLabel htmlFor="issue-form-title">Title</FormLabel>
              <FormControl>
                <Input
                  id="issue-form-title"
                  maxLength={120}
                  autoFocus
                  placeholder="What needs to be done?"
                  aria-invalid={Boolean(form.formState.errors.title)}
                  aria-describedby={
                    form.formState.errors.title
                      ? "issue-form-title-error"
                      : undefined
                  }
                  {...form.register("title")}
                />
              </FormControl>
              <FormMessage id="issue-form-title-error">
                {form.formState.errors.title?.message}
              </FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="issue-form-description">
                Description
              </FormLabel>
              <FormControl>
                <Textarea
                  id="issue-form-description"
                  rows={5}
                  maxLength={20_000}
                  placeholder="Add context, acceptance criteria, or next steps…"
                  aria-invalid={Boolean(form.formState.errors.description)}
                  {...form.register("description")}
                />
              </FormControl>
              <div className="flex items-center justify-between gap-3">
                <FormMessage>
                  {form.formState.errors.description?.message}
                </FormMessage>
                <span className="ml-auto text-xs text-muted-foreground">
                  {description.length.toLocaleString()} / 20,000
                </span>
              </div>
            </FormItem>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="issue-form-type">Type</FormLabel>
                <Select
                  value={typeValue}
                  onValueChange={(value) => {
                    if (value === "BUG" || value === "FEATURE" || value === "TASK") {
                      form.setValue("type", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="issue-form-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUG">Bug</SelectItem>
                    <SelectItem value="FEATURE">Feature</SelectItem>
                    <SelectItem value="TASK">Task</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="issue-form-priority">Priority</FormLabel>
                <Select
                  value={priorityValue}
                  onValueChange={(value) => {
                    if (
                      value === "LOW" ||
                      value === "MEDIUM" ||
                      value === "HIGH" ||
                      value === "CRITICAL"
                    ) {
                      form.setValue("priority", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="issue-form-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            </div>

            <FormItem>
              <FormLabel htmlFor="issue-form-assignee">Assignee</FormLabel>
              <Select
                value={assigneeId || "unassigned"}
                onValueChange={(value) => {
                  if (value !== null) {
                    form.setValue(
                      "assigneeId",
                      value === "unassigned" ? "" : value,
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="issue-form-assignee"
                  aria-invalid={Boolean(form.formState.errors.assigneeId)}
                  aria-describedby={
                    form.formState.errors.assigneeId
                      ? "issue-form-assignee-error"
                      : undefined
                  }
                >
                  <SelectValue>
                    {assigneeLabel(assigneeId, members)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback
                            className="text-[0.6rem] font-semibold text-white"
                            style={{ backgroundColor: member.avatarColor }}
                          >
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage id="issue-form-assignee-error">
                {form.formState.errors.assigneeId?.message}
              </FormMessage>
            </FormItem>

            {form.formState.errors.root?.server?.message && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.server.message}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : isEditing ? (
                  <Pencil aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create issue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
  return (
    <IssueFormDialog
      projectId={projectId}
      members={members}
      buttonLabel={buttonLabel}
      onSaved={() => onCreated()}
    />
  );
}
