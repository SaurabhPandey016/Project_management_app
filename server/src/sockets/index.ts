import type { Server as HttpServer } from "node:http";
import { ProjectRole } from "@prisma/client";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { allowedOrigins } from "../config/cors.js";
import { AppError } from "../lib/AppError.js";
import { verifyToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import { projectEvents } from "../modules/issues/events.js";
import type {
  ProjectEventPayload,
  ProjectEventType,
} from "../modules/issues/events.js";
import { requireProjectRole } from "../modules/projects/permissions.js";

export interface SocketUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface SocketData {
  user: SocketUser;
}

export interface SocketAcknowledgement {
  success: boolean;
  error?: { code: string; message: string };
}

export interface ProjectRoomPayload {
  projectId: string;
}

export interface ProjectChangeEvents {
  "issue:created": (payload: ProjectEventPayload) => void;
  "issue:updated": (payload: ProjectEventPayload) => void;
  "issue:moved": (payload: ProjectEventPayload) => void;
  "issue:deleted": (payload: ProjectEventPayload) => void;
  "comment:created": (payload: ProjectEventPayload) => void;
  "comment:updated": (payload: ProjectEventPayload) => void;
  "comment:deleted": (payload: ProjectEventPayload) => void;
  "member:joined": (payload: ProjectEventPayload) => void;
  "member:removed": (payload: ProjectEventPayload) => void;
}

export interface ClientToServerEvents {
  "project:join": (
    payload: unknown,
    acknowledge?: (result: SocketAcknowledgement) => void,
  ) => void;
  "project:leave": (
    payload: unknown,
    acknowledge?: (result: SocketAcknowledgement) => void,
  ) => void;
}

export interface ServerToClientEvents extends ProjectChangeEvents {
  "presence:update": (payload: {
    projectId: string;
    users: SocketUser[];
  }) => void;
}

interface InterServerEvents {
  [event: string]: (...args: never[]) => void;
}

type IssueFlowSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type IssueFlowServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const projectRoomPayloadSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
});

const projectRoomByEvent: Record<ProjectEventType, keyof ProjectChangeEvents> =
  {
    "issue.created": "issue:created",
    "issue.updated": "issue:updated",
    "issue.moved": "issue:moved",
    "issue.deleted": "issue:deleted",
    "comment.created": "comment:created",
    "comment.updated": "comment:updated",
    "comment.deleted": "comment:deleted",
    "member.joined": "member:joined",
    "member.removed": "member:removed",
  };

function projectRoom(projectId: string): string {
  return `project:${projectId}`;
}

function fail(
  acknowledge: ((result: SocketAcknowledgement) => void) | undefined,
  code: string,
  message: string,
): void {
  acknowledge?.({ success: false, error: { code, message } });
}

async function broadcastPresence(
  io: IssueFlowServer,
  projectId: string,
): Promise<void> {
  const sockets = await io.in(projectRoom(projectId)).fetchSockets();
  const users = new Map<string, SocketUser>();

  for (const socket of sockets) {
    users.set(socket.data.user.id, socket.data.user);
  }

  io.to(projectRoom(projectId)).emit("presence:update", {
    projectId,
    users: [...users.values()],
  });
}

async function broadcastPresenceSafely(
  io: IssueFlowServer,
  projectId: string,
): Promise<void> {
  try {
    await broadcastPresence(io, projectId);
  } catch (error) {
    logger.error(
      { err: error, projectId },
      "Failed to broadcast project presence",
    );
  }
}

async function removeUserFromProjectRoom(
  io: IssueFlowServer,
  projectId: string,
  userId: string,
): Promise<void> {
  try {
    const room = projectRoom(projectId);
    const sockets = await io.in(room).fetchSockets();
    await Promise.all(
      sockets
        .filter((socket) => socket.data.user.id === userId)
        .map((socket) => socket.leave(room)),
    );
    await broadcastPresence(io, projectId);
  } catch (error) {
    logger.error(
      { err: error, projectId, userId },
      "Failed to remove project member sockets",
    );
  }
}

function authenticateSocket(
  socket: IssueFlowSocket,
  next: (error?: Error) => void,
): void {
  const auth = z
    .object({ token: z.string().min(1) })
    .safeParse(socket.handshake.auth);

  if (!auth.success) {
    next(new Error("Unauthorized: a socket token is required"));
    return;
  }

  try {
    const payload = verifyToken(auth.data.token);
    if (payload.purpose !== "socket" || typeof payload.sub !== "string") {
      next(new Error("Unauthorized: invalid socket token"));
      return;
    }

    void prisma.user
      .findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, avatarColor: true },
      })
      .then((user) => {
        if (user === null) {
          next(new Error("Unauthorized: socket user was not found"));
          return;
        }

        socket.data.user = user;
        next();
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, "Failed to authenticate socket user");
        next(new Error("Unable to authenticate socket connection"));
      });
  } catch {
    next(new Error("Unauthorized: invalid or expired socket token"));
  }
}

function handleJoin(
  io: IssueFlowServer,
  socket: IssueFlowSocket,
  payload: unknown,
  acknowledge?: (result: SocketAcknowledgement) => void,
): void {
  const parsed = projectRoomPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    fail(acknowledge, "VALIDATION_ERROR", "A valid projectId is required");
    return;
  }

  const { projectId } = parsed.data;
  void (async () => {
    try {
      await requireProjectRole(ProjectRole.MEMBER)(
        prisma,
        projectId,
        socket.data.user.id,
      );
      const room = projectRoom(projectId);
      const alreadyJoined = socket.rooms.has(room);
      await socket.join(room);
      acknowledge?.({ success: true });

      if (!alreadyJoined) {
        await broadcastPresenceSafely(io, projectId);
      }
    } catch (error) {
      if (error instanceof AppError) {
        fail(acknowledge, error.code, error.message);
        return;
      }

      logger.error(
        { err: error, projectId, userId: socket.data.user.id },
        "Failed to join project room",
      );
      fail(acknowledge, "JOIN_FAILED", "Unable to join project");
    }
  })();
}

function handleLeave(
  io: IssueFlowServer,
  socket: IssueFlowSocket,
  payload: unknown,
  acknowledge?: (result: SocketAcknowledgement) => void,
): void {
  const parsed = projectRoomPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    fail(acknowledge, "VALIDATION_ERROR", "A valid projectId is required");
    return;
  }

  const { projectId } = parsed.data;
  const room = projectRoom(projectId);
  if (!socket.rooms.has(room)) {
    acknowledge?.({ success: true });
    return;
  }

  void (async () => {
    try {
      await socket.leave(room);
      acknowledge?.({ success: true });
      await broadcastPresenceSafely(io, projectId);
    } catch (error) {
      logger.error(
        { err: error, projectId, userId: socket.data.user.id },
        "Failed to leave project room",
      );
      fail(acknowledge, "LEAVE_FAILED", "Unable to leave project");
    }
  })();
}

function handleProjectEvent(
  io: IssueFlowServer,
  event: {
    projectId: string;
    type: ProjectEventType;
    payload: ProjectEventPayload;
  },
): void {
  io.to(projectRoom(event.projectId)).emit(
    projectRoomByEvent[event.type],
    event.payload,
  );

  if (event.type === "member.removed") {
    const userId = event.payload.entity.userId;
    if (typeof userId === "string") {
      void removeUserFromProjectRoom(io, event.projectId, userId);
    }
  }
}

export function createSocketServer(httpServer: HttpServer): IssueFlowServer {
  const io: IssueFlowServer = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: [...allowedOrigins],
      credentials: false,
    },
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    let disconnectingProjectIds: string[] = [];

    socket.on("project:join", (payload, acknowledge) => {
      handleJoin(io, socket, payload, acknowledge);
    });
    socket.on("project:leave", (payload, acknowledge) => {
      handleLeave(io, socket, payload, acknowledge);
    });
    socket.on("disconnecting", () => {
      disconnectingProjectIds = [...socket.rooms]
        .filter((room) => room.startsWith("project:"))
        .map((room) => room.slice("project:".length));
    });
    socket.on("disconnect", () => {
      for (const projectId of disconnectingProjectIds) {
        void broadcastPresenceSafely(io, projectId);
      }
    });
  });

  projectEvents.on("project:event", (event) => {
    handleProjectEvent(io, event);
  });

  return io;
}
