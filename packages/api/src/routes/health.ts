import { testConnection } from '@starter/db';
import { Hono } from 'hono';

import { checkStorage } from '../lib/storage';

const health = new Hono().get('/', async (c) => {
  let dbHealthy = false;
  let storageHealthy = false;
  try {
    dbHealthy = await testConnection();
  } catch {
    dbHealthy = false;
  }
  try {
    storageHealthy = await checkStorage();
  } catch {
    storageHealthy = false;
  }

  const healthy = dbHealthy && storageHealthy;
  const status = healthy ? 'ok' : 'degraded';
  const statusCode = healthy ? 200 : 503;

  return c.json(
    {
      status: status as 'ok' | 'degraded',
      db: dbHealthy,
      storage: storageHealthy,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  );
});

export { health };
