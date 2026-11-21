import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { env } from "@/lib/env";

export interface SocketEventPayload {
  entity: Record<string, unknown>;
  actorId: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface ServerToClientEvents {
  "issue:created": (payload: SocketEventPayload) => void;
  "issue:updated": (payload: SocketEventPayload) => void;
  "issue:moved": (payload: SocketEventPayload) => void;
  "issue:deleted": (payload: SocketEventPayload) => void;
  "comment:created": (payload: SocketEventPayload) => void;
  "comment:updated": (payload: SocketEventPayload) => void;
  "comment:deleted": (payload: SocketEventPayload) => void;
  "member:joined": (payload: SocketEventPayload) => void;
  "member:removed": (payload: SocketEventPayload) => void;
  "presence:update": (payload: {
    projectId: string;
    users: PresenceUser[];
  }) => void;
}

export interface ClientToServerEvents {
  "project:join": (
    payload: unknown,
    acknowledge?: (result: {
      success: boolean;
      error?: { code: string; message: string };
    }) => void,
  ) => void;
  "project:leave": (
    payload: unknown,
    acknowledge?: (result: {
      success: boolean;
      error?: { code: string; message: string };
    }) => void,
  ) => void;
}

export type ProjectEventName = Exclude<
  keyof ServerToClientEvents,
  "presence:update"
>;
export type ProjectSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ProjectEventHandlers = Partial<{
  [Event in ProjectEventName]: (payload: SocketEventPayload) => void;
}>;

const projectEventNames: ProjectEventName[] = [
  "issue:created",
  "issue:updated",
  "issue:moved",
  "issue:deleted",
  "comment:created",
  "comment:updated",
  "comment:deleted",
  "member:joined",
  "member:removed",
];

let socket: ProjectSocket | null = null;
let activeLeases = 0;
let connectionScheduled = false;
const projectLeaseCounts = new Map<string, number>();
const connectionListeners = new Set<(reconnecting: boolean) => void>();

function publishConnectionState(reconnecting: boolean): void {
  for (const listener of connectionListeners) listener(reconnecting);
}

function getSocket(): ProjectSocket {
  if (socket !== null) return socket;

  socket = io(env.socketUrl, {
    autoConnect: false,
    auth: (callback) => {
      void api
        .get<{ token: string }>("/auth/socket-token")
        .then(({ token }) => callback({ token }))
        .catch(() => callback({ token: "" }));
    },
    withCredentials: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
  });

  socket.on("connect", () => {
    publishConnectionState(false);
    for (const projectId of projectLeaseCounts.keys()) {
      socket?.emit("project:join", { projectId });
    }
  });
  socket.on("disconnect", () => publishConnectionState(activeLeases > 0));
  socket.on("connect_error", () => publishConnectionState(activeLeases > 0));
  socket.io.on("reconnect_attempt", () => publishConnectionState(true));

  return socket;
}

export function subscribeToConnectionState(
  listener: (reconnecting: boolean) => void,
): () => void {
  connectionListeners.add(listener);
  listener(socket?.connected !== true && activeLeases > 0);
  return () => connectionListeners.delete(listener);
}

export function acquireProjectSocket(projectId: string): () => void {
  const projectCount = projectLeaseCounts.get(projectId) ?? 0;
  projectLeaseCounts.set(projectId, projectCount + 1);
  activeLeases += 1;

  const projectSocket = getSocket();
  if (projectCount === 0 && projectSocket.connected) {
    projectSocket.emit("project:join", { projectId });
  }
  if (!projectSocket.connected) {
    publishConnectionState(true);
    if (!connectionScheduled) {
      connectionScheduled = true;
      queueMicrotask(() => {
        connectionScheduled = false;
        if (activeLeases > 0 && !projectSocket.connected) {
          projectSocket.connect();
        }
      });
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLeases = Math.max(0, activeLeases - 1);
    const remaining = (projectLeaseCounts.get(projectId) ?? 1) - 1;
    if (remaining <= 0) {
      projectLeaseCounts.delete(projectId);
      if (projectSocket.connected) {
        projectSocket.emit("project:leave", { projectId });
      }
    } else {
      projectLeaseCounts.set(projectId, remaining);
    }

    if (activeLeases === 0) {
      projectSocket.disconnect();
      publishConnectionState(false);
    }
  };
}

export function subscribeToProjectEvents(
  projectSocket: ProjectSocket,
  getHandlers: () => ProjectEventHandlers,
  currentUserId: string | undefined,
): () => void {
  const listeners: Array<{
    event: ProjectEventName;
    listener: (payload: SocketEventPayload) => void;
  }> = [];

  for (const event of projectEventNames) {
    const listener = (payload: SocketEventPayload) => {
      if (payload.actorId === currentUserId) {
        if (
          event !== "member:removed" ||
          payload.entity.userId !== currentUserId
        ) {
          return;
        }
      }
      getHandlers()[event]?.(payload);
    };
    projectSocket.on(event, listener);
    listeners.push({ event, listener });
  }

  return () => {
    for (const { event, listener } of listeners) {
      projectSocket.off(event, listener);
    }
  };
}

export function getProjectSocket(): ProjectSocket | null {
  return socket;
}
