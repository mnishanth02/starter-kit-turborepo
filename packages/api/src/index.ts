import { ErrorCode } from '@starter/validation';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiError, globalErrorHandler } from './lib/errors';
import { clerkAuthMiddleware } from './middleware/clerk';
import { requestId } from './middleware/request-id';
import { cleanupRoute } from './routes/cleanup';
import { demoRoute } from './routes/demo';
import { health } from './routes/health';
import { me } from './routes/me';
import { projectsRoute } from './routes/projects';
import { publicRoute } from './routes/public';
import { uploads } from './routes/uploads';
import { webhooksRoute } from './routes/webhooks';

const app = new Hono().basePath('/api');

app.onError(globalErrorHandler);

app.notFound((c) => apiError(c, ErrorCode.NOT_FOUND, 'Route not found'));

app.use('*', requestId);
app.use(
  '*',
  cors({
    origin: (origin) => {
      const envVar = process.env.CORS_ALLOWED_ORIGINS;
      if (!envVar || envVar.trim() === '') {
        if (process.env.NODE_ENV === 'production') {
          return null;
        }
        return origin;
      }
      const allowed = envVar.split(',').map((o) => o.trim());
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 600,
    credentials: true,
  }),
);
app.use('/me', clerkAuthMiddleware);
app.use('/me/*', clerkAuthMiddleware);
app.use('/projects', clerkAuthMiddleware);
app.use('/projects/*', clerkAuthMiddleware);
app.use('/uploads', clerkAuthMiddleware);
app.use('/uploads/*', clerkAuthMiddleware);
app.use('/demo', clerkAuthMiddleware);
app.use('/demo/*', clerkAuthMiddleware);
// /webhooks intentionally has no Clerk middleware — Svix signature verifies the caller

const routes = app
  .route('/health', health)
  .route('/me', me)
  .route('/projects', projectsRoute)
  .route('/public', publicRoute)
  .route('/uploads', uploads)
  .route('/demo', demoRoute)
  .route('/cleanup', cleanupRoute)
  .route('/webhooks', webhooksRoute);

export type AppType = typeof routes;
export default app;

export { apiError, validationError } from './lib/errors';
export { requireAuth, requireResourceOwner } from './middleware/auth';
