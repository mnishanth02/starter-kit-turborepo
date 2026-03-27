import { Hono } from 'hono';

const publicRoute = new Hono()
  // GET /public/ping — unauthenticated health/reachability check
  .get('/ping', (c) =>
    c.json({
      message: 'pong',
      timestamp: new Date().toISOString(),
    }),
  );

export { publicRoute };
