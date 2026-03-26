import { createMiddleware } from 'hono/factory';
import { createLogger } from '../lib/logger';

// Declare the Hono context variables this middleware provides
type RequestIdEnv = {
  Variables: {
    requestId: string;
  };
};

export const requestId = createMiddleware<RequestIdEnv>(async (c, next) => {
  const id = crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-Id', id);

  const logger = createLogger(id);
  const start = performance.now();

  logger.info(`→ ${c.req.method} ${c.req.path}`);

  await next();

  const duration = (performance.now() - start).toFixed(2);
  logger.info(`← ${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
});
