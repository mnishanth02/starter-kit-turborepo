import { db, projects } from '@starter/db';
import { createProjectInput, ErrorCode, updateProjectInput } from '@starter/validation';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { apiError, validationError } from '../lib/errors';
import { requireAuth, requireResourceOwner } from '../middleware/auth';

// Extend Hono context variable map so route handlers can read the loaded project
declare module 'hono' {
  interface ContextVariableMap {
    project: typeof projects.$inferSelect;
  }
}

/**
 * Middleware: load the project identified by the `:id` route param.
 * Sets `c.get('project')` on success; returns 404 when the project does not exist.
 * Must run after `requireAuth` so the auth context is already populated.
 */
function loadProject() {
  return createMiddleware(async (c, next) => {
    const id = c.req.param('id');
    if (!id) {
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

  // GET /projects — list current user's projects
  .get('/', async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userProjects = await db.select().from(projects).where(eq(projects.userId, auth.userId));

    return c.json(userProjects);
  })

  // POST /projects — create a new project for the current user
  .post('/', async (c) => {
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

  // GET /projects/:id — fetch a single project (ownership enforced)
  .get(
    '/:id',
    loadProject(),
    requireResourceOwner((c) => c.get('project').userId),
    async (c) => c.json(c.get('project')),
  )

  // PUT /projects/:id — update a project (ownership enforced)
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

      const id = c.req.param('id');
      if (!id) {
        return apiError(c, ErrorCode.NOT_FOUND, 'Project not found');
      }

      const [updated] = await db
        .update(projects)
        .set(parsed.data)
        .where(eq(projects.id, id))
        .returning();

      return c.json(updated);
    },
  )

  // DELETE /projects/:id — delete a project (ownership enforced)
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
