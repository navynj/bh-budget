import { NextResponse } from 'next/server';

/**
 * Expected / business errors. Use for validation, config, and known failure cases.
 * In catch: show e.message to user. Unexpected errors (Error): show GENERIC_ERROR_MESSAGE, always console.error(e).
 * Optional details (e.g. locationId for QB_REFRESH_EXPIRED) for redirects or UI.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Show in UI for unexpected errors; always log full error with console.error(e). */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong';

/**
 * Standard API error response: log with context, return NextResponse.json({ error }, status).
 * AppError → 502 + message; other errors → 500 + GENERIC_ERROR_MESSAGE.
 */
export function toApiErrorResponse(err: unknown, logContext: string): NextResponse {
  console.error(logContext, err);
  const message =
    err instanceof AppError ? err.message : GENERIC_ERROR_MESSAGE;
  const status = err instanceof AppError ? 502 : 500;
  return NextResponse.json({ error: message }, { status });
}
