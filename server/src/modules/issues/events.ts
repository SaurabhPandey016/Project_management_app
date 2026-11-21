import { EventEmitter } from "node:events";
import { logger } from "../../lib/logger.js";

export type ProjectEventType =
  | "issue.created"
  | "issue.updated"
  | "issue.moved"
  | "issue.deleted"
  | "comment.created"
  | "comment.updated"
  | "comment.deleted"
  | "member.joined"
  | "member.removed";

export interface ProjectEventPayload {
  entity: Record<string, unknown>;
  actorId: string;
}

export interface ProjectEvent {
  projectId: string;
  type: ProjectEventType;
  payload: ProjectEventPayload;
}

export const projectEvents = new EventEmitter();

export function emitProjectEvent(
  projectId: string,
  type: ProjectEventType,
  payload: ProjectEvent["payload"],
): void {
  const event: ProjectEvent = { projectId, type, payload };
  logger.info({ projectId, eventType: type }, "Project event emitted");
  projectEvents.emit("project:event", event);
}
