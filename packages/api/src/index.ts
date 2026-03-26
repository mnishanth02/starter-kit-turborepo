import { clerkMiddleware } from '@hono/clerk-auth';
import { ErrorCode } from '@starter/validation';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiError, globalErrorHandler } from './lib/errors';
import { requestId } from './middleware/request-id';
import { health } from './routes/health';

const app = new Hono().basePath('/api');

// Global error handler
app.onError(globalErrorHandler);

// 404 handler — keeps all responses in the JSON error contract
app.notFound((c) => apiError(c, ErrorCode.NOT_FOUND, 'Route not found'));

// Middleware order: request-id → CORS → Clerk auth
app.use('*', requestId);
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? [];
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    credentials: true,
  }),
);
app.use('*', clerkMiddleware());

// Routes — chain to capture types for RPC client derivation
const routes = app.route('/health', health);

export type AppType = typeof routes;
export default app;

export { apiError, validationError } from './lib/errors';
// Re-export middleware and helpers for route files
export { requireAuth, requireResourceOwner } from './middleware/auth';
