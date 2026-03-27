import { db, projects } from '@starter/db';
import {
  createProjectInput,
  ErrorCode,
  paginationQuery,
  updateProjectInput,
} from '@starter/validation';
import { count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { apiError, validationError } from '../lib/errors';
import { requireAuth, requireResourceOwner } from '../middleware/auth';
import { withRateLimit } from '../middleware/ratelimit';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare module 'hono' {
  interface ContextVariableMap {
    project: typeof projects.$inferSelect;
  }
}

function loadProject() {
  return createMiddleware(async (c, next) => {
    const id = c.req.param('id');
    if (!id || !UUID_PATTERN.test(id)) {
      return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, id));

    if (!project) {
      return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
    }

    c.set('project', project);
    await next();
  });
}

const projectsRoute = new Hono()
  .use('*', requireAuth)

  // GET /projects — list current user's projects (supports ?page=1&limit=20)
  .get('/', async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const parsedPage = paginationQuery.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });
    const { page, limit } = parsedPage.success ? parsedPage.data : { page: 1, limit: 20 };
    const offset = (page - 1) * limit;

    const [totalRow] = await db
      .select({ total: count() })
      .from(projects)
      .where(eq(projects.userId, auth.userId));

    const records = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, auth.userId))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    const total = totalRow?.total ?? 0;
    return c.json({
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  })

  // POST /projects — create a new project for the current user (20 req/min)
  .post('/', withRateLimit('projects:create', 20, '1 m'), async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }

    const parsed = createProjectInput.safeParse(body);
    if (!parsed.success) {
      return validationError(c, parsed.error);
    }

    const [project] = await db
      .insert(projects)
      .values({
        userId: auth.userId,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .returning();

    return c.json(project, 201);
  })

  .get(
    '/:id',
    loadProject(),
    requireResourceOwner((c) => c.get('project').userId),
    async (c) => c.json(c.get('project')),
  )

  .put(
    '/:id',
    loadProject(),
    requireResourceOwner((c) => c.get('project').userId),
    async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        body = null;
      }

      const parsed = updateProjectInput.safeParse(body);
      if (!parsed.success) {
        return validationError(c, parsed.error);
      }

      if (Object.keys(parsed.data).length === 0) {
        return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ]);
      }

      const id = c.req.param('id');
      if (!id || !UUID_PATTERN.test(id)) {
        return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
      }

      const [updated] = await db
        .update(projects)
        .set(parsed.data)
        .where(eq(projects.id, id))
        .returning();

      if (!updated) {
        return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
      }

      return c.json(updated);
    },
  )

  .delete(
    '/:id',
    loadProject(),
    requireResourceOwner((c) => c.get('project').userId),
    async (c) => {
      const id = c.req.param('id');
      if (!id) {
        return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
      }

      await db.delete(projects).where(eq(projects.id, id));
      return c.body(null, 204);
    },
  );

export { projectsRoute };
