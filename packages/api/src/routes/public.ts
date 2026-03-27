import { Hono } from 'hono';

import { withRateLimit } from '../middleware/ratelimit';

const publicRoute = new Hono()
  // GET /public/ping — unauthenticated health/reachability check
  .get('/ping', withRateLimit('public:ping', 20, '1 m'), (c) =>
    c.json({
      message: 'pong',
      timestamp: new Date().toISOString(),
    }),
  );

export { publicRoute };
