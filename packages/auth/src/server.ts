/**
 * @starter/auth/server — SERVER-ONLY utilities
 *
 * Provides Clerk backend helpers reusable outside of Hono context
 * (seed scripts, webhooks, cron jobs, etc.).
 *
 * For Hono-specific auth middleware, see packages/api/src/middleware/auth.ts
 */

import { verifyToken as clerkVerifyToken, createClerkClient } from '@clerk/backend';

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  throw new Error('CLERK_SECRET_KEY environment variable is required');
}

const clerkClient = createClerkClient({ secretKey });

export { clerkClient };

/** Verify a Clerk session token (useful for non-Hono contexts). */
export async function verifyToken(token: string) {
  return clerkVerifyToken(token, { secretKey });
}

/** Fetch a Clerk user by their Clerk user ID. */
export async function getUser(userId: string) {
  return clerkClient.users.getUser(userId);
}

/** Check whether the authenticated user owns the resource. */
export function isResourceOwner(authUserId: string, resourceUserId: string): boolean {
  return authUserId === resourceUserId;
}
