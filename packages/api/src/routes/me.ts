import { getUser } from '@starter/auth/server';
import { ErrorCode } from '@starter/validation';
import { Hono } from 'hono';

import { apiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const me = new Hono().use('*', requireAuth).get('/', async (c) => {
  const auth = c.get('auth');
  if (!auth?.userId) {
    return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
  }

  const userId = auth.userId;

  const user = await (async () => {
    try {
      return await getUser(userId);
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof error.status === 'number'
          ? error.status
          : null;

      if (status === 404) {
        return apiError(c, ErrorCode.UNAUTHORIZED, 'Authenticated user could not be found');
      }

      console.error('[Clerk] Failed to load authenticated user for /api/me', error);
      return apiError(c, ErrorCode.INTERNAL_ERROR, 'Authentication provider unavailable');
    }
  })();

  if (user instanceof Response) {
    return user;
  }

  return c.json({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? null,
  });
});

export { me };
