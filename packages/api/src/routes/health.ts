import { testConnection } from '@starter/db';
import { Hono } from 'hono';

const health = new Hono().get('/', async (c) => {
  let dbHealthy = false;
  try {
    dbHealthy = await testConnection();
  } catch {
    dbHealthy = false;
  }

  const status = dbHealthy ? 'ok' : 'degraded';
  const statusCode = dbHealthy ? 200 : 503;

  return c.json(
    {
      status: status as 'ok' | 'degraded',
      db: dbHealthy,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  );
});

export { health };
