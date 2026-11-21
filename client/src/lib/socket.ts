import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";

export interface SocketEventPayload {
  entity: Record<string, unknown>;
  actorId: string;
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
    users: Array<{ id: string; name: string; email: string; avatarColor: string }>;
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

export function createProjectSocket(
  token: string,
): Socket {
  return io(env.socketUrl, {
    auth: { token },
    withCredentials: false,
    transports: ["websocket", "polling"],
  });
}
