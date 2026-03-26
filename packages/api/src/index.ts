import { ErrorCode } from '@starter/validation';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiError, globalErrorHandler } from './lib/errors';
import { clerkAuthMiddleware } from './middleware/clerk';
import { requestId } from './middleware/request-id';
import { health } from './routes/health';
import { me } from './routes/me';

const app = new Hono().basePath('/api');

// Global error handler
app.onError(globalErrorHandler);

// Use c.json() (via apiError) — never c.notFound() — so RPC clients
// can infer the 404 response type. See https://hono.dev/docs/guides/rpc
app.notFound((c) => apiError(c, ErrorCode.NOT_FOUND, 'Route not found'));

// Middleware order: request-id → CORS → Clerk auth
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
app.use('*', clerkAuthMiddleware);

// Routes — chain to capture types for RPC client derivation
const routes = app.route('/health', health).route('/me', me);

export type AppType = typeof routes;
export default app;

export { apiError, validationError } from './lib/errors';
// Re-export middleware and helpers for route files
export { requireAuth, requireResourceOwner } from './middleware/auth';
