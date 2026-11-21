import { randomUUID } from "node:crypto";
import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from "socket.io-client";
import { z } from "zod";
import { env } from "../src/config/env.js";
import { signToken } from "../src/lib/jwt.js";
import type {
  ClientToServerEvents,
  ProjectChangeEvents,
  SocketAcknowledgement,
  ServerToClientEvents,
} from "../src/sockets/index.js";

const apiUrl = `http://127.0.0.1:${env.PORT}/api`;
const credentials = {
  email: process.env.SOCKET_SMOKE_EMAIL ?? "demo@issueflow.dev",
  password: process.env.SOCKET_SMOKE_PASSWORD ?? "Demo@12345",
};
const projectKey = process.env.SOCKET_SMOKE_PROJECT_KEY ?? "WEB";

const loginResponseSchema = z.object({
  success: z.literal(true),
});
const socketTokenResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ token: z.string().min(1) }),
});
const projectsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ id: z.string(), key: z.string() })),
});
const issueResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    title: z.string(),
    key: z.string(),
  }),
});

type SmokeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${apiUrl}${path}`, init);
  const body: unknown = await response.json();
  return { response, body };
}

async function connectSocket(socket: SmokeSocket): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out connecting Socket.IO client")),
      10_000,
    );
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function getConnectionError(socket: SmokeSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error("Timed out waiting for socket authentication failure"),
        ),
      10_000,
    );
    socket.once("connect", () => {
      clearTimeout(timeout);
      reject(new Error("Socket connected without a socket-purpose token"));
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      resolve(error.message);
    });
  });
}

function joinProject(
  socket: SmokeSocket,
  projectId: string,
): Promise<SocketAcknowledgement> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(new Error("Timed out waiting for project:join acknowledgement")),
      5_000,
    );
    socket.emit("project:join", { projectId }, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

function waitForCreatedIssue(
  socket: SmokeSocket,
): Promise<Parameters<ProjectChangeEvents["issue:created"]>[0]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out waiting for issue:created event")),
      30_000,
    );
    socket.once("issue:created", (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

async function main(): Promise<void> {
  let cookie: string | undefined;
  let issueId: string | undefined;
  let projectId: string | undefined;
  let sender: SmokeSocket | undefined;
  let receiver: SmokeSocket | undefined;

  try {
    const login = await requestJson("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    assert(
      login.response.ok,
      `Login failed with HTTP ${login.response.status}`,
    );
    loginResponseSchema.parse(login.body);
    const setCookie = login.response.headers.get("set-cookie");
    cookie = setCookie?.split(";")[0];
    assert(cookie !== undefined, "Login response did not set the auth cookie");

    const authHeaders = { cookie };
    const [tokenResult, projectResult] = await Promise.all([
      requestJson("/auth/socket-token", { headers: authHeaders }),
      requestJson("/projects", { headers: authHeaders }),
    ]);
    assert(
      tokenResult.response.ok,
      `Socket token request failed with HTTP ${tokenResult.response.status}`,
    );
    assert(
      projectResult.response.ok,
      `Project list request failed with HTTP ${projectResult.response.status}`,
    );
    const tokenBody = socketTokenResponseSchema.parse(tokenResult.body);
    const projectsBody = projectsResponseSchema.parse(projectResult.body);
    const project = projectsBody.data.find(
      (candidate) => candidate.key === projectKey,
    );
    assert(
      project !== undefined,
      `Project ${projectKey} was not found for the smoke-test user`,
    );
    projectId = project.id;

    const socketOptions: Partial<ManagerOptions & SocketOptions> = {
      auth: { token: tokenBody.data.token },
      reconnection: false,
      transports: ["websocket"],
    };
    const invalidSocket = io(`http://127.0.0.1:${env.PORT}`, {
      ...socketOptions,
      auth: { token: signToken({ sub: "not-a-socket-user" }) },
    }) as SmokeSocket;
    const authenticationError = await getConnectionError(invalidSocket);
    invalidSocket.disconnect();
    assert(
      authenticationError.includes("invalid socket token"),
      "A JWT without the socket purpose was not rejected clearly",
    );

    sender = io(`http://127.0.0.1:${env.PORT}`, socketOptions) as SmokeSocket;
    receiver = io(`http://127.0.0.1:${env.PORT}`, socketOptions) as SmokeSocket;
    await Promise.all([connectSocket(sender), connectSocket(receiver)]);

    const joinResults = await Promise.all([
      joinProject(sender, project.id),
      joinProject(receiver, project.id),
    ]);
    assert(
      joinResults.every((result) => result.success),
      "A project member could not join the project room",
    );

    const unauthorizedJoin = await joinProject(
      receiver,
      `unauthorized-${randomUUID()}`,
    );
    assert(
      !unauthorizedJoin.success && unauthorizedJoin.error?.code === "NOT_FOUND",
      "Unauthorized project room join was not rejected",
    );

    const issueTitle = `Socket smoke ${randomUUID()}`;
    const issueEvent = waitForCreatedIssue(receiver);
    const createResult = await requestJson(`/projects/${project.id}/issues`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        type: "TASK",
        priority: "LOW",
      }),
    });
    assert(
      createResult.response.status === 201,
      `Issue creation failed with HTTP ${createResult.response.status}`,
    );
    const createdIssue = issueResponseSchema.parse(createResult.body).data;
    issueId = createdIssue.id;
    const event = await issueEvent;
    assert(
      event.actorId.length > 0 &&
        typeof event.entity === "object" &&
        event.entity !== null &&
        "id" in event.entity &&
        event.entity.id === createdIssue.id &&
        "title" in event.entity &&
        event.entity.title === issueTitle,
      "The second client received an invalid issue:created event",
    );

    console.log(
      "Socket smoke test passed: authenticated joins, unauthorized join rejection, and issue:created broadcast.",
    );
  } finally {
    sender?.disconnect();
    receiver?.disconnect();

    if (
      cookie !== undefined &&
      issueId !== undefined &&
      projectId !== undefined
    ) {
      const cleanup = await fetch(
        `${apiUrl}/projects/${projectId}/issues/${issueId}`,
        {
          method: "DELETE",
          headers: { cookie },
        },
      );
      if (!cleanup.ok) {
        console.error(
          `Could not clean up smoke-test issue (HTTP ${cleanup.status})`,
        );
        process.exitCode = 1;
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error("Socket smoke test failed", error);
  process.exitCode = 1;
});
