import { Hono } from 'hono';

// Chain .get() to capture route types for RPC inference
const health = new Hono().get('/', (c) => {
  return c.json({
    status: 'ok' as const,
    db: false, // Wired to real DB check in Phase 3
    timestamp: new Date().toISOString(),
  });
});

export { health };
