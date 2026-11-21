import { ApiError } from "@/lib/api";

export function getFriendlyErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "You don’t have permission to do that.";
    }
    if (error.status === 404) {
      return "This project or invitation is no longer available.";
    }
    if (error.status === 409) {
      return "That change conflicts with the latest project data. Refresh and try again.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
