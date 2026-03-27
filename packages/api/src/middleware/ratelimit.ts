import { ErrorCode } from '@starter/validation';
import { type Duration, Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createMiddleware } from 'hono/factory';

import { apiError } from '../lib/errors';

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, window: Duration): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const key = `${name}:${limit}:${window}`;
  if (!limiters.has(key)) {
    const redis = new Redis({ url, token });
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: name,
      }),
    );
  }
  return limiters.get(key) ?? null;
}

export function withRateLimit(name: string, limit: number, window: Duration) {
  return createMiddleware(async (c, next) => {
    const limiter = getLimiter(name, limit, window);
    if (!limiter) return next();

    const auth = c.get('auth') as { userId?: string } | undefined;
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const identifier = auth?.userId ? `${name}:user:${auth.userId}` : `${name}:ip:${ip}`;

    const { success, limit: rateLimit, remaining, reset } = await limiter.limit(identifier);
    c.header('X-RateLimit-Limit', String(rateLimit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(reset));

    if (!success) {
      return apiError(c, ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.');
    }
    return next();
  });
}
