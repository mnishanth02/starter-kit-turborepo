import type { Context } from 'hono';

/**
 * Client IP extraction for rate limiting.
 *
 * Priority:
 * 1. X-Real-IP — set by Vercel / reverse proxies, not client-spoofable.
 * 2. X-Forwarded-For (leftmost) — fallback for non-Vercel deployments.
 *    Note: the leftmost value CAN be injected by the client, so this is
 *    less trustworthy unless your proxy strips or overwrites the header.
 * 3. Socket remote address — local development fallback.
 *
 * For non-Vercel deployments, configure your reverse proxy to set X-Real-IP
 * to the true client address.
 */
export function getClientIp(c: Context): string {
  // X-Real-IP is set by Vercel/reverse proxies and is not client-spoofable
  const realIp = c.req.header('x-real-ip');
  if (realIp) return realIp;

  // Fallback: X-Forwarded-For (leftmost IP, but note this can be spoofed)
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  // Local development fallback
  // biome-ignore lint/suspicious/noExplicitAny: env shape varies by runtime
  const socket = (c.env as any)?.incoming?.socket;
  return socket?.remoteAddress ?? '127.0.0.1';
}
