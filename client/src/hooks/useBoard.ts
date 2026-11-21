"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import { matchesIssueSearch } from "@/lib/issue-search";
import type { Issue, IssueStatus } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import type { SocketEventPayload } from "@/lib/socket";
import { parseIssueEvent } from "@/lib/project-events";

export type IssueBoard = Record<IssueStatus, Issue[]>;

function matchesBoardQuery(
  issue: Issue,
  queryString: string,
  currentUserId: string | undefined,
): boolean {
  const query = new URLSearchParams(queryString);
  const search = query.get("q") ?? "";
  if (!matchesIssueSearch(issue, search)) {
    return false;
  }

  const priorities = query.get("priority")?.split(",") ?? [];
  if (priorities.length > 0 && !priorities.includes(issue.priority))
    return false;
  const types = query.get("type")?.split(",") ?? [];
  if (types.length > 0 && !types.includes(issue.type)) return false;

  const assigneeId = query.get("assigneeId");
  if (assigneeId === "unassigned" && issue.assigneeId !== null) return false;
  if (
    assigneeId === "me" &&
    (currentUserId === undefined || issue.assigneeId !== currentUserId)
  ) {
    return false;
  }
  if (
    assigneeId &&
    assigneeId !== "me" &&
    assigneeId !== "unassigned" &&
    issue.assigneeId !== assigneeId
  ) {
    return false;
  }
  return true;
}

function eventIssue(
  payload: SocketEventPayload,
  projectId: string,
): Issue | null {
  return parseIssueEvent(payload.entity, projectId);
}

function insertIssue(board: IssueBoard, issue: Issue): IssueBoard {
  const next: IssueBoard = {
    TODO: board.TODO.filter((item) => item.id !== issue.id),
    IN_PROGRESS: board.IN_PROGRESS.filter((item) => item.id !== issue.id),
    DONE: board.DONE.filter((item) => item.id !== issue.id),
  };
  next[issue.status].push(issue);
  next[issue.status].sort(
    (first, second) =>
      first.position - second.position || first.id.localeCompare(second.id),
  );
  return next;
}

function removeIssue(board: IssueBoard, issueId: string): IssueBoard {
  return {
    TODO: board.TODO.filter((issue) => issue.id !== issueId),
    IN_PROGRESS: board.IN_PROGRESS.filter((issue) => issue.id !== issueId),
    DONE: board.DONE.filter((issue) => issue.id !== issueId),
  };
}

interface MoveIssueResponse {
  issue: Issue;
  rebalanced: boolean;
}

function moveIssueInBoard(
  board: IssueBoard,
  issueId: string,
  status: IssueStatus,
  index: number,
): IssueBoard {
  const next: IssueBoard = {
    TODO: [...board.TODO],
    IN_PROGRESS: [...board.IN_PROGRESS],
    DONE: [...board.DONE],
  };
  let issue: Issue | undefined;

  for (const column of Object.values(next)) {
    const issueIndex = column.findIndex(
      (candidate) => candidate.id === issueId,
    );
    if (issueIndex >= 0) {
      [issue] = column.splice(issueIndex, 1);
      break;
    }
  }

  if (issue === undefined) return board;

  next[status].splice(Math.max(0, Math.min(index, next[status].length)), 0, {
    ...issue,
    status,
  });
  return next;
}

export function useBoard(projectId: string, refreshKey = 0, queryString = "") {
  const { user } = useAuth();
  const [board, setBoard] = useState<IssueBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingIssueIds, setMovingIssueIds] = useState<Set<string>>(
    () => new Set(),
  );
  const boardRef = useRef<IssueBoard | null>(null);
  const movingIssueIdsRef = useRef(new Set<string>());
  const requestIdRef = useRef(0);
  const needsReconciliationRef = useRef(false);
  const [highlightedIssueIds, setHighlightedIssueIds] = useState<Set<string>>(
    () => new Set(),
  );
  const highlightTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  const loadBoard = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(boardRef.current === null);
    setError(null);
    try {
      const nextBoard = await api.get<IssueBoard>(
        `/projects/${projectId}/board${queryString ? `?${queryString}` : ""}`,
      );
      if (requestId !== requestIdRef.current) return;
      boardRef.current = nextBoard;
      setBoard(nextBoard);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(
        getFriendlyErrorMessage(requestError, "Unable to load the board"),
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [projectId, queryString]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, refreshKey]);

  const moveIssue = useCallback(
    async (issueId: string, status: IssueStatus, index: number) => {
      const currentBoard = boardRef.current;
      if (currentBoard === null || movingIssueIdsRef.current.has(issueId))
        return;

      const sourceStatus = (Object.keys(currentBoard) as IssueStatus[]).find(
        (column) => currentBoard[column].some((issue) => issue.id === issueId),
      );
      if (sourceStatus === undefined) return;

      const sourceIndex = currentBoard[sourceStatus].findIndex(
        (issue) => issue.id === issueId,
      );
      const targetWithoutIssue = currentBoard[status].filter(
        (issue) => issue.id !== issueId,
      );
      const destinationIndex = Math.max(
        0,
        Math.min(index, targetWithoutIssue.length),
      );
      if (sourceStatus === status && sourceIndex === destinationIndex) return;

      const beforeId =
        destinationIndex > 0
          ? targetWithoutIssue[destinationIndex - 1]?.id
          : undefined;
      const afterId = targetWithoutIssue[destinationIndex]?.id;

      movingIssueIdsRef.current.add(issueId);
      setMovingIssueIds(new Set(movingIssueIdsRef.current));
      const optimisticBoard = moveIssueInBoard(
        currentBoard,
        issueId,
        status,
        destinationIndex,
      );
      boardRef.current = optimisticBoard;
      setBoard(optimisticBoard);

      try {
        const result = await api.patch<MoveIssueResponse>(
          `/projects/${projectId}/issues/${issueId}/move`,
          {
            status,
            ...(beforeId === undefined ? {} : { beforeId }),
            ...(afterId === undefined ? {} : { afterId }),
          },
        );
        const updatedBoard = boardRef.current;
        if (updatedBoard !== null) {
          const nextBoard: IssueBoard = {
            TODO: updatedBoard.TODO.map((issue) =>
              issue.id === issueId
                ? { ...result.issue, commentCount: issue.commentCount }
                : issue,
            ),
            IN_PROGRESS: updatedBoard.IN_PROGRESS.map((issue) =>
              issue.id === issueId
                ? { ...result.issue, commentCount: issue.commentCount }
                : issue,
            ),
            DONE: updatedBoard.DONE.map((issue) =>
              issue.id === issueId
                ? { ...result.issue, commentCount: issue.commentCount }
                : issue,
            ),
          };
          boardRef.current = nextBoard;
          setBoard(nextBoard);
        }
        needsReconciliationRef.current = true;
      } catch (requestError) {
        const latestBoard = boardRef.current;
        if (latestBoard !== null) {
          const restoredBoard = moveIssueInBoard(
            latestBoard,
            issueId,
            sourceStatus,
            sourceIndex,
          );
          boardRef.current = restoredBoard;
          setBoard(restoredBoard);
        }
        toast.error(
          getFriendlyErrorMessage(requestError, "Unable to move this issue"),
        );
      } finally {
        movingIssueIdsRef.current.delete(issueId);
        setMovingIssueIds(new Set(movingIssueIdsRef.current));
        if (
          movingIssueIdsRef.current.size === 0 &&
          needsReconciliationRef.current
        ) {
          needsReconciliationRef.current = false;
          await loadBoard();
        }
      }
    },
    [loadBoard, projectId],
  );

  const applyRemoteIssue = useCallback(
    (payload: SocketEventPayload, deleted = false) => {
      const issue = eventIssue(payload, projectId);
      const currentBoard = boardRef.current;
      if (issue === null) return;
      if (currentBoard === null) {
        void loadBoard();
        return;
      }

      const existing = Object.values(currentBoard)
        .flat()
        .find((item) => item.id === issue.id);
      if (deleted || !matchesBoardQuery(issue, queryString, user?.id)) {
        if (existing === undefined) return;
        const nextBoard = removeIssue(currentBoard, issue.id);
        boardRef.current = nextBoard;
        setBoard(nextBoard);
      } else {
        const nextIssue =
          issue.commentCount === undefined &&
          existing?.commentCount !== undefined
            ? { ...issue, commentCount: existing.commentCount }
            : issue;
        const nextBoard = insertIssue(currentBoard, nextIssue);
        boardRef.current = nextBoard;
        setBoard(nextBoard);
        setHighlightedIssueIds((current) => new Set(current).add(issue.id));
        const previousTimer = highlightTimersRef.current.get(issue.id);
        if (previousTimer !== undefined) clearTimeout(previousTimer);
        const timer = setTimeout(() => {
          setHighlightedIssueIds((current) => {
            const next = new Set(current);
            next.delete(issue.id);
            return next;
          });
          highlightTimersRef.current.delete(issue.id);
        }, 1200);
        highlightTimersRef.current.set(issue.id, timer);
      }
    },
    [loadBoard, projectId, queryString, user?.id],
  );

  const updateRemoteCommentCount = useCallback(
    (payload: SocketEventPayload, isCreated: boolean) => {
      const issueId = payload.entity.issueId;
      if (typeof issueId !== "string") return;
      const currentBoard = boardRef.current;
      if (currentBoard === null) {
        void loadBoard();
        return;
      }
      const nextBoard: IssueBoard = {
        TODO: currentBoard.TODO.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                commentCount: Math.max(
                  0,
                  (issue.commentCount ?? 0) +
                    (isCreated
                      ? 1
                      : payload.entity.isDeleted === true
                        ? 0
                        : -1),
                ),
              }
            : issue,
        ),
        IN_PROGRESS: currentBoard.IN_PROGRESS.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                commentCount: Math.max(
                  0,
                  (issue.commentCount ?? 0) +
                    (isCreated
                      ? 1
                      : payload.entity.isDeleted === true
                        ? 0
                        : -1),
                ),
              }
            : issue,
        ),
        DONE: currentBoard.DONE.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                commentCount: Math.max(
                  0,
                  (issue.commentCount ?? 0) +
                    (isCreated
                      ? 1
                      : payload.entity.isDeleted === true
                        ? 0
                        : -1),
                ),
              }
            : issue,
        ),
      };
      boardRef.current = nextBoard;
      setBoard(nextBoard);
    },
    [loadBoard],
  );
  const handleRemoteMove = useCallback(
    (payload: SocketEventPayload) => {
      applyRemoteIssue(payload);
      needsReconciliationRef.current = true;
      if (movingIssueIdsRef.current.size === 0) {
        needsReconciliationRef.current = false;
        void loadBoard();
      }
    },
    [applyRemoteIssue, loadBoard],
  );

  useProjectSocket(projectId, {
    "issue:created": (payload) => applyRemoteIssue(payload),
    "issue:updated": (payload) => applyRemoteIssue(payload),
    "issue:moved": handleRemoteMove,
    "issue:deleted": (payload) => applyRemoteIssue(payload, true),
    "comment:created": (payload) => updateRemoteCommentCount(payload, true),
    "comment:deleted": (payload) => updateRemoteCommentCount(payload, false),
  });

  useEffect(
    () => () => {
      for (const timer of highlightTimersRef.current.values()) {
        clearTimeout(timer);
      }
    },
    [],
  );

  return {
    board,
    isLoading,
    error,
    retry: loadBoard,
    moveIssue,
    movingIssueIds,
    highlightedIssueIds,
  };
}
