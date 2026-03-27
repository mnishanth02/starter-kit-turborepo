import { Ratelimit } from '@upstash/ratelimit';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withRateLimit } from './ratelimit';

describe('withRateLimit', () => {
  describe('when Redis is not configured', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('passes through without rate-limit headers', async () => {
      const app = new Hono();
      app.use('/*', withRateLimit('no-redis', 5, '1 m'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeNull();
      expect(res.headers.get('X-RateLimit-Reset')).toBeNull();
      expect(res.headers.get('Retry-After')).toBeNull();
    });
  });

  describe('when Redis is configured', () => {
    beforeEach(() => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
    });

    it('allows requests within the limit and sets rate-limit headers', async () => {
      const resetTime = Date.now() + 60_000;
      vi.spyOn(Ratelimit.prototype, 'limit').mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: resetTime,
        pending: Promise.resolve(),
        reason: undefined,
      });

      const app = new Hono();
      app.use('/*', withRateLimit('allow-test', 5, '1 m'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(res.headers.get('X-RateLimit-Reset')).toBe(String(resetTime));
      expect(res.headers.get('Retry-After')).toBeNull();
    });

    it('returns 429 when rate limited', async () => {
      const resetTime = Date.now() + 30_000;
      vi.spyOn(Ratelimit.prototype, 'limit').mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
        pending: Promise.resolve(),
        reason: undefined,
      });

      const app = new Hono();
      app.use('/*', withRateLimit('block-test', 5, '1 m'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');

      expect(res.status).toBe(429);

      const body = (await res.json()) as { code: string; message: string };
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.message).toBe('Too many requests. Please try again later.');

      expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');

      const retryAfter = Number(res.headers.get('Retry-After'));
      expect(retryAfter).toBeGreaterThan(0);
    });

    it('uses IP from X-Forwarded-For for identifier', async () => {
      const limitSpy = vi.spyOn(Ratelimit.prototype, 'limit').mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
        reason: undefined,
      });

      const app = new Hono();
      app.use('/*', withRateLimit('ip-xff-test', 5, '1 m'));
      app.get('/test', (c) => c.json({ ok: true }));

      await app.request('/test', {
        headers: { 'X-Forwarded-For': '1.2.3.4' },
      });

      expect(limitSpy).toHaveBeenCalledWith('ip-xff-test:ip:1.2.3.4');
    });

    it('uses userId for identifier when authenticated', async () => {
      const limitSpy = vi.spyOn(Ratelimit.prototype, 'limit').mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
        reason: undefined,
      });

      const app = new Hono();
      app.use('/*', async (c, next) => {
        c.set('auth', { userId: 'user_123', redirectTo: null });
        return next();
      });
      app.use('/*', withRateLimit('user-auth-test', 5, '1 m'));
      app.get('/test', (c) => c.json({ ok: true }));

      await app.request('/test');

      expect(limitSpy).toHaveBeenCalledWith('user-auth-test:user:user_123');
    });
  });
});
