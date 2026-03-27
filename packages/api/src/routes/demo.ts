import { Hono } from 'hono';

import { requireAuth } from '../middleware/auth';
import { withRateLimit } from '../middleware/ratelimit';

export const demoRoute = new Hono()
  .use('*', requireAuth)
  .get('/ping', withRateLimit('demo:ping', 5, '1 m'), (c) =>
    c.json({ pong: true, timestamp: new Date().toISOString() }),
  );
