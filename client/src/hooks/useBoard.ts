"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Issue, IssueStatus } from "@/types/domain";

export type IssueBoard = Record<IssueStatus, Issue[]>;

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
    const issueIndex = column.findIndex((candidate) => candidate.id === issueId);
    if (issueIndex >= 0) {
      [issue] = column.splice(issueIndex, 1);
      break;
    }
  }

  if (issue === undefined) return board;

  next[status].splice(
    Math.max(0, Math.min(index, next[status].length)),
    0,
    { ...issue, status },
  );
  return next;
}

export function useBoard(
  projectId: string,
  refreshKey = 0,
  queryString = "",
) {
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
      setError(getFriendlyErrorMessage(requestError, "Unable to load the board"));
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
      if (currentBoard === null || movingIssueIdsRef.current.has(issueId)) return;

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

  return { board, isLoading, error, retry: loadBoard, moveIssue, movingIssueIds };
}
