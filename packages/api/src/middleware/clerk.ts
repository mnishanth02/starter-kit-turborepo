import { createClerkClient } from '@clerk/backend';
import 'hono';
import { createMiddleware } from 'hono/factory';

export interface ApiAuth {
  userId: string | null;
  redirectTo: string | null;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: ApiAuth;
  }
}

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  throw new Error('CLERK_SECRET_KEY environment variable is required');
}

const publishableKey =
  process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('CLERK_PUBLISHABLE_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required');
}

const authorizedParties = (() => {
  const envVar = process.env.CLERK_AUTHORIZED_PARTIES ?? process.env.CORS_ALLOWED_ORIGINS;
  if (!envVar || envVar.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CLERK_AUTHORIZED_PARTIES or CORS_ALLOWED_ORIGINS is required in production');
    }
    return undefined;
  }

  return envVar
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
})();

const clerkClient = createClerkClient({
  secretKey,
  publishableKey,
});

export const clerkAuthMiddleware = createMiddleware(async (c, next) => {
  const requestState = await clerkClient.authenticateRequest(c.req.raw, {
    secretKey,
    publishableKey,
    authorizedParties,
    acceptsToken: 'any',
  });

  const auth = requestState.toAuth();
  c.set('auth', {
    userId: auth && 'userId' in auth ? auth.userId : null,
    redirectTo: requestState.headers?.get('location') ?? null,
  });

  await next();

  requestState.headers?.forEach((value, key) => {
    if (key.toLowerCase() !== 'location') {
      c.header(key, value, { append: true });
    }
  });
});
