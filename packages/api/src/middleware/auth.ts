import { getAuth } from '@hono/clerk-auth';
import { ErrorCode } from '@starter/validation';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import { apiError } from '../lib/errors';

/**
 * Middleware that requires a valid authenticated user.
 * Must be placed AFTER Clerk auth middleware in the chain.
 * Checks that clerkAuth() returns a valid userId.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
  }

  await next();
});

/**
 * Middleware factory that verifies the authenticated user owns the resource.
 * Compares the authenticated userId against the resource's owner ID.
 * Must be used AFTER requireAuth.
 */
export function requireResourceOwner(getResourceUserId: (c: Context) => string | Promise<string>) {
  return createMiddleware(async (c, next) => {
    const auth = getAuth(c);
    const resourceUserId = await getResourceUserId(c);

    if (auth?.userId !== resourceUserId) {
      return apiError(c, ErrorCode.FORBIDDEN, 'You do not have access to this resource');
    }

    await next();
  });
}
