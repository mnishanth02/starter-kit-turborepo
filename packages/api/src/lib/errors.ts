import { type ApiError, ErrorCode, type FieldError } from '@starter/validation';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const STATUS_MAP: Record<string, ContentfulStatusCode> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export function apiError(c: Context, code: ErrorCode, message: string, errors?: FieldError[]) {
  const status = STATUS_MAP[code] ?? 500;
  const body: ApiError = { code, message, ...(errors && { errors }) };
  return c.json(body, status);
}

export function validationError(
  c: Context,
  zodError: { issues: Array<{ path: PropertyKey[]; message: string }> },
) {
  const errors: FieldError[] = zodError.issues.map((issue) => ({
    field: issue.path
      .map((segment) => (typeof segment === 'symbol' ? String(segment) : segment))
      .join('.'),
    message: issue.message,
  }));
  return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', errors);
}

export function globalErrorHandler(err: Error, c: Context) {
  // Map Hono's HTTPException to our JSON error contract
  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    const code =
      (Object.entries(STATUS_MAP).find(([, s]) => s === status)?.[0] as ErrorCode) ??
      ErrorCode.INTERNAL_ERROR;
    return apiError(c, code, err.message || 'Request failed');
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.error(`[API Error] ${c.req.method} ${c.req.path}`, err.stack ?? err.message);
  } else {
    console.error(`[API Error] ${c.req.method} ${c.req.path}`, err.message);
  }

  return apiError(c, ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred');
}
