import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { requestId } from '../middleware/request-id';
import { publicRoute } from './public';

// ---------------------------------------------------------------------------
// Local test app — no auth middleware needed for public routes.
// ---------------------------------------------------------------------------
const testApp = new Hono().basePath('/api');
testApp.use('*', requestId);
testApp.route('/public', publicRoute);

// ---------------------------------------------------------------------------
// GET /api/public/ping
// ---------------------------------------------------------------------------
describe('GET /api/public/ping', () => {
  it('returns 200 with message pong and a timestamp', async () => {
    const before = Date.now();
    const res = await testApp.request('/api/public/ping');
    const after = Date.now();

    expect(res.status).toBe(200);

    const body = (await res.json()) as { message: string; timestamp: string };
    expect(body.message).toBe('pong');
    expect(typeof body.timestamp).toBe('string');

    // Timestamp must be a valid ISO-8601 date within the test window
    const ts = new Date(body.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('does not require any auth header', async () => {
    // No authenticateAs/authenticateAsGuest call — raw request with no token
    const res = await testApp.request('/api/public/ping', {
      headers: {},
    });
    expect(res.status).toBe(200);
  });
});
