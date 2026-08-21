/**
 * Shared route-handler plumbing (AGENTS.md §11, §14).
 *
 * Single place that maps unknown thrown values to a sanitized JSON error
 * response. Never leaks stack traces, SQL details, or internal IDs (§14.1).
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApplicationError, logOperational } from '@/lib/logging';

/** A user-safe, language-independent error envelope. */
export interface ApiErrorBody {
  readonly error: string;
  readonly issues?: readonly { readonly path: string; readonly message: string }[];
}

/**
 * Convert any thrown value into a sanitized error response.
 * Zod → VALIDATION_ERROR (400) with field issues; ApplicationError → its code
 * and mapped status; anything else → INTERNAL_ERROR (500) with a generic body.
 */
export function toErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      } satisfies ApiErrorBody,
      { status: 400 },
    );
  }

  if (error instanceof ApplicationError) {
    return NextResponse.json(
      { error: error.code } satisfies ApiErrorBody,
      { status: error.status },
    );
  }

  logOperational({
    level: 'error',
    message: `${context} failed`,
    errorCode: 'INTERNAL_ERROR',
  });
  return NextResponse.json(
    { error: 'INTERNAL_ERROR' } satisfies ApiErrorBody,
    { status: 500 },
  );
}
