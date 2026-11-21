import type { ApiFailure } from "@/types/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const unauthorizedEvent = "issueflow:unauthorized";
export const serviceFailureEvent = "issueflow:service-failure";

function notifyServiceFailure(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(serviceFailureEvent));
  }
}

function isApiFailure(value: unknown): value is ApiFailure {
  if (typeof value !== "object" || value === null || !("success" in value)) {
    return false;
  }

  if (value.success !== false || !("error" in value)) return false;
  const error = value.error;

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function handleUnauthorized(path: string): void {
  if (typeof window === "undefined" || path.startsWith("/auth/")) return;

  window.dispatchEvent(new Event(unauthorizedEvent));
}

async function request<TData>(
  path: string,
  init: RequestInit = {},
): Promise<TData> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      cache: init.cache ?? "no-store",
      headers,
      credentials: "include",
    });
  } catch (error) {
    notifyServiceFailure();
    throw new ApiError(
      error instanceof Error ? error.message : "Unable to reach the server",
      0,
      "NETWORK_ERROR",
    );
  }

  if ([502, 503, 504].includes(response.status)) notifyServiceFailure();
  if (response.status === 204) return undefined as TData;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "The server returned an invalid response",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  if (!response.ok || isApiFailure(body)) {
    if (response.status === 401) handleUnauthorized(path);
    if (isApiFailure(body)) {
      throw new ApiError(
        body.error.message,
        response.status,
        body.error.code,
        body.error.details,
      );
    }

    throw new ApiError(
      "The request could not be completed",
      response.status,
      "HTTP_ERROR",
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("success" in body) ||
    body.success !== true ||
    !("data" in body)
  ) {
    throw new ApiError(
      "The server returned an invalid response",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  return body.data as TData;
}

export const api = {
  get: <TData>(path: string, init?: RequestInit) =>
    request<TData>(path, { ...init, method: "GET" }),
  post: <TData>(path: string, body?: unknown, init?: RequestInit) =>
    request<TData>(path, {
      ...init,
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  patch: <TData>(path: string, body: unknown, init?: RequestInit) =>
    request<TData>(path, {
      ...init,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <TData>(path: string, init?: RequestInit) =>
    request<TData>(path, { ...init, method: "DELETE" }),
};

export { unauthorizedEvent };
