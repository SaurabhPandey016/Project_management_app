"use client";

import { useEffect, useRef, useState } from "react";
import {
  acquireProjectSocket,
  getProjectSocket,
  subscribeToConnectionState,
  subscribeToProjectEvents,
  type PresenceUser,
  type ProjectEventHandlers,
} from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";

export function useProjectSocket(
  projectId: string,
  handlers: ProjectEventHandlers = {},
) {
  const { user } = useAuth();
  const handlersRef = useRef(handlers);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const release = acquireProjectSocket(projectId);
    const socket = getProjectSocket();
    if (socket === null) {
      release();
      return;
    }

    const unsubscribeEvents = subscribeToProjectEvents(
      socket,
      () => handlersRef.current,
      user?.id,
    );
    const onPresence = (payload: {
      projectId: string;
      users: PresenceUser[];
    }) => {
      if (payload.projectId === projectId) setPresenceUsers(payload.users);
    };
    socket.on("presence:update", onPresence);
    const unsubscribeConnection = subscribeToConnectionState(setIsReconnecting);

    return () => {
      unsubscribeEvents();
      socket.off("presence:update", onPresence);
      unsubscribeConnection();
      release();
    };
  }, [projectId, user?.id]);

  return { presenceUsers, isReconnecting };
}
