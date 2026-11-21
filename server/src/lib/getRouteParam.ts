import { AppError } from "./AppError.js";

export function getRouteParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`Invalid ${name}`, 400, "VALIDATION_ERROR");
  }

  return value;
}
