"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  LoaderCircle,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Comment, ProjectRole, User } from "@/types/domain";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import type { SocketEventPayload } from "@/lib/socket";
import { parseCommentEvent } from "@/lib/project-events";

interface IssueCommentsProps {
  projectId: string;
  issueId: string;
  currentUser: User | null;
  role: ProjectRole | undefined;
  onUnavailable: (error: unknown) => void;
  onChanged: (commentCount: number) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function appendComment(
  comments: Comment[],
  parentId: string | null,
  comment: Comment,
): Comment[] {
  if (parentId === null) return [...comments, comment];

  return comments.map((item) =>
    item.id === parentId
      ? { ...item, replies: [...item.replies, comment] }
      : { ...item, replies: appendComment(item.replies, parentId, comment) },
  );
}

function updateComment(
  comments: Comment[],
  commentId: string,
  update: (comment: Comment) => Comment,
): Comment[] {
  return comments.map((comment) =>
    comment.id === commentId
      ? update(comment)
      : {
          ...comment,
          replies: updateComment(comment.replies, commentId, update),
        },
  );
}

function removeComment(comments: Comment[], commentId: string): Comment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeComment(comment.replies, commentId),
    }));
}

function containsComment(comments: Comment[], commentId: string): boolean {
  return comments.some(
    (comment) =>
      comment.id === commentId || containsComment(comment.replies, commentId),
  );
}

function findComment(
  comments: Comment[],
  commentId: string,
): Comment | undefined {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    const reply = findComment(comment.replies, commentId);
    if (reply !== undefined) return reply;
  }
  return undefined;
}

function mergeLiveComments(fetched: Comment[], live: Comment[]): Comment[] {
  const merged = fetched.map((comment) => {
    const liveVersion = findComment(live, comment.id);
    const isLiveNewer =
      liveVersion !== undefined &&
      (liveVersion.isDeleted ||
        (liveVersion.editedAt ?? "") > (comment.editedAt ?? ""));
    return {
      ...comment,
      ...(isLiveNewer ? liveVersion : {}),
      replies: mergeLiveComments(comment.replies, liveVersion?.replies ?? []),
    };
  });

  for (const comment of live) {
    if (
      comment.parentId === null &&
      findComment(fetched, comment.id) === undefined
    ) {
      merged.push(comment);
    }
  }
  return merged;
}

function relativeDate(value: string): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function IssueComments({
  projectId,
  issueId,
  currentUser,
  role,
  onUnavailable,
  onChanged,
}: IssueCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsRef = useRef<Comment[]>([]);
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const loadComments = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const result = await api.get<Comment[]>(
        `/projects/${projectId}/issues/${issueId}/comments`,
      );
      const merged = mergeLiveComments(result, commentsRef.current);
      commentsRef.current = merged;
      setComments(merged);
      onChanged(countComments(merged));
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        onUnavailable(error);
      } else {
        setLoadError(getFriendlyErrorMessage(error, "Unable to load comments"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [issueId, onChanged, onUnavailable, projectId]);

  useEffect(() => {
    let active = true;
    api
      .get<Comment[]>(`/projects/${projectId}/issues/${issueId}/comments`)
      .then((result) => {
        if (!active) return;
        const merged = mergeLiveComments(result, commentsRef.current);
        commentsRef.current = merged;
        setComments(merged);
        onChanged(countComments(merged));
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (
          error instanceof ApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          onUnavailable(error);
          return;
        }
        setLoadError(getFriendlyErrorMessage(error, "Unable to load comments"));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [issueId, onChanged, onUnavailable, projectId]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const handleRemoteCommentCreated = useCallback(
    (payload: SocketEventPayload) => {
      const comment = parseCommentEvent(payload.entity);
      if (comment === null || comment.issueId !== issueId) return;
      const current = commentsRef.current;
      if (containsComment(current, comment.id)) return;
      if (
        comment.parentId !== null &&
        !containsComment(current, comment.parentId)
      ) {
        void loadComments();
        return;
      }

      const next = appendComment(current, comment.parentId, comment);
      commentsRef.current = next;
      setComments(next);
      onChanged(countComments(next));
    },
    [issueId, loadComments, onChanged],
  );
  const handleRemoteCommentUpdated = useCallback(
    (payload: SocketEventPayload) => {
      const comment = parseCommentEvent(payload.entity);
      if (comment === null || comment.issueId !== issueId) return;
      const current = commentsRef.current;
      if (!containsComment(current, comment.id)) {
        void loadComments();
        return;
      }

      const next = updateComment(current, comment.id, (existing) => ({
        ...existing,
        ...comment,
        replies: existing.replies,
      }));
      commentsRef.current = next;
      setComments(next);
      onChanged(countComments(next));
    },
    [issueId, loadComments, onChanged],
  );
  const handleRemoteCommentDeleted = useCallback(
    (payload: SocketEventPayload) => {
      const comment = parseCommentEvent(payload.entity);
      if (comment === null || comment.issueId !== issueId) return;
      const current = commentsRef.current;
      if (!containsComment(current, comment.id)) return;

      const next = comment.isDeleted
        ? updateComment(current, comment.id, (existing) => ({
            ...existing,
            content: "[deleted]",
            isDeleted: true,
          }))
        : removeComment(current, comment.id);
      commentsRef.current = next;
      setComments(next);
      onChanged(countComments(next));
    },
    [issueId, onChanged],
  );

  useProjectSocket(projectId, {
    "comment:created": handleRemoteCommentCreated,
    "comment:updated": handleRemoteCommentUpdated,
    "comment:deleted": handleRemoteCommentDeleted,
  });

  async function submitComment(
    content: string,
    parentId: string | null,
  ): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting || currentUser === null) return;

    const previousComments = comments;
    const optimisticComment: Comment = {
      id: `pending-${crypto.randomUUID()}`,
      issueId,
      authorId: currentUser.id,
      parentId,
      content: trimmed,
      isDeleted: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      author: currentUser,
      replies: [],
    };
    const optimisticComments = appendComment(
      previousComments,
      parentId,
      optimisticComment,
    );
    setComments(optimisticComments);
    onChanged(countComments(optimisticComments));
    setIsSubmitting(true);
    if (parentId === null) setComposer("");
    else {
      setReplyDraft("");
      setReplyTarget(null);
    }

    try {
      const created = await api.post<Omit<Comment, "replies">>(
        `/projects/${projectId}/issues/${issueId}/comments`,
        { content: trimmed, ...(parentId === null ? {} : { parentId }) },
      );
      const createdComment: Comment = { ...created, replies: [] };
      setComments((current) =>
        updateComment(current, optimisticComment.id, () => createdComment),
      );
      toast.success(parentId === null ? "Comment added" : "Reply added");
      onChanged(countComments(optimisticComments));
    } catch (error) {
      setComments(previousComments);
      onChanged(countComments(previousComments));
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        onUnavailable(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to post comment"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveEdit(comment: Comment) {
    const content = editDraft.trim();
    if (!content || isSubmitting) return;
    const previousComments = comments;
    setComments((current) =>
      updateComment(current, comment.id, (item) => ({
        ...item,
        content,
        editedAt: new Date().toISOString(),
      })),
    );
    setIsSubmitting(true);
    try {
      const updated = await api.patch<Omit<Comment, "replies">>(
        `/projects/${projectId}/comments/${comment.id}`,
        { content },
      );
      setComments((current) =>
        updateComment(current, comment.id, (item) => ({
          ...item,
          ...updated,
          replies: item.replies,
        })),
      );
      setEditingId(null);
      toast.success("Comment updated");
    } catch (error) {
      setComments(previousComments);
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        onUnavailable(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to edit comment"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (deleteTarget === null || isSubmitting) return;
    const comment = deleteTarget;
    const previousComments = comments;
    setComments((current) =>
      comment.replies.length > 0
        ? updateComment(current, comment.id, (item) => ({
            ...item,
            content: "[deleted]",
            isDeleted: true,
            editedAt: item.editedAt,
          }))
        : removeComment(current, comment.id),
    );
    setDeleteTarget(null);
    setIsSubmitting(true);
    try {
      const result = await api.delete<{ softDeleted: boolean }>(
        `/projects/${projectId}/comments/${comment.id}`,
      );
      if (result?.softDeleted) {
        setComments((current) =>
          updateComment(current, comment.id, (item) => ({
            ...item,
            content: "[deleted]",
            isDeleted: true,
          })),
        );
      }
      onChanged(countComments(comments) - (result?.softDeleted ? 0 : 1));
      toast.success("Comment deleted");
    } catch (error) {
      setComments(previousComments);
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        onUnavailable(error);
      } else {
        toast.error(getFriendlyErrorMessage(error, "Unable to delete comment"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderComment(comment: Comment, depth: number) {
    const isAuthor = comment.authorId === currentUser?.id;
    const canDelete = isAuthor || isAdmin;
    const isDeleted = comment.isDeleted || comment.content === "[deleted]";

    return (
      <article
        key={comment.id}
        aria-label={`Comment by ${comment.author.name}`}
        className={`relative ${depth > 0 ? "ml-4 border-l border-border/70 pl-3 sm:ml-6 sm:pl-4" : ""}`}
      >
        <div className="flex items-start gap-2.5">
          <Avatar size="sm" className="mt-0.5">
            <AvatarFallback
              className="text-[0.6rem] font-semibold text-white"
              style={{ backgroundColor: comment.author.avatarColor }}
            >
              {initials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">{comment.author.name}</span>
              <time
                dateTime={comment.createdAt}
                title={new Date(comment.createdAt).toLocaleString()}
                className="text-xs text-muted-foreground"
              >
                {relativeDate(comment.createdAt)}
              </time>
              {comment.editedAt && !isDeleted && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {editingId === comment.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  aria-label="Edit comment"
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting || !editDraft.trim()}
                    onClick={() => void saveEdit(comment)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${
                  isDeleted ? "italic text-muted-foreground" : ""
                }`}
              >
                {comment.content}
              </p>
            )}

            {!isDeleted && editingId !== comment.id && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {depth < 2 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setReplyTarget(comment.id);
                      setReplyDraft("");
                    }}
                  >
                    Reply
                  </Button>
                )}
                {isAuthor && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditDraft(comment.content);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(comment)}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            {replyTarget === comment.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  aria-label={`Reply to ${comment.author.name}`}
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Write a reply…"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => setReplyTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting || !replyDraft.trim()}
                    onClick={() => void submitComment(replyDraft, comment.id)}
                  >
                    {isSubmitting ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="animate-spin"
                      />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {comment.replies.length > 0 && (
          <div className="mt-3 space-y-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </article>
    );
  }

  return (
    <section aria-labelledby="issue-comments-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3
          id="issue-comments-heading"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <MessageSquare
            aria-hidden="true"
            className="size-4 text-indigo-300"
          />
          Comments
        </h3>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {countComments(comments)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div aria-label="Loading comments" className="space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-border p-3"
        >
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void loadComments()}
          >
            Retry
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Start the conversation
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => renderComment(comment, 0))}
        </div>
      )}

      <div className="sticky bottom-0 space-y-2 border-t border-border/70 bg-background/95 pt-3 backdrop-blur">
        <label htmlFor="issue-comment-composer" className="text-sm font-medium">
          Add a comment
        </label>
        <Textarea
          id="issue-comment-composer"
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Share an update or ask a question…"
          disabled={isSubmitting || currentUser === null}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {composer.length} / 2,000
          </span>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || !composer.trim() || currentUser === null}
            onClick={() => void submitComment(composer, null)}
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Send aria-hidden="true" />
            )}
            Comment
          </Button>
        </div>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this comment?</DialogTitle>
            <DialogDescription>
              Replies stay in the thread; this comment will appear as deleted.
              Comments without replies are permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void confirmDelete()}
            >
              {isSubmitting && (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              )}
              Delete comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function countComments(comments: Comment[]): number {
  return comments.reduce(
    (count, comment) => count + 1 + countComments(comment.replies),
    0,
  );
}
