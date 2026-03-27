import { db, projects } from '@starter/db';
import { truncateTestTables } from '@starter/db/testing';
import { Hono } from 'hono';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clerkAuthMiddleware } from '../middleware/clerk';
import { requestId } from '../middleware/request-id';
import { hasConfiguredTestDatabase } from '../test/db';
import { authenticateAs, authenticateAsGuest } from '../test/request';
import { projectsRoute } from './projects';

// ---------------------------------------------------------------------------
// Local test app — routes not yet wired to the main app (that happens in a
// separate todo), so we mount them here for isolated testing.
// ---------------------------------------------------------------------------
const testApp = new Hono().basePath('/api');
testApp.use('*', requestId);
testApp.use('*', clerkAuthMiddleware);
testApp.route('/projects', projectsRoute);

function req(userId: string, path: string, init?: RequestInit) {
  authenticateAs(userId);
  return testApp.request(path, init);
}

function guest(path: string, init?: RequestInit) {
  authenticateAsGuest();
  return testApp.request(path, init);
}

// ---------------------------------------------------------------------------
// DB isolation — truncate between test suites because route tests span
// multiple requests through the shared db singleton.
// ---------------------------------------------------------------------------
const hasTestDatabase = hasConfiguredTestDatabase();
const describeIfTestDatabase = hasTestDatabase ? describe : describe.skip;

if (hasTestDatabase) {
  beforeAll(async () => {
    await truncateTestTables();
  });

  afterEach(async () => {
    await truncateTestTables();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function seedProject(userId: string, overrides: Partial<typeof projects.$inferInsert> = {}) {
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name: 'Test Project',
      description: 'A seeded test project',
      ...overrides,
    })
    .returning();
  // INSERT always returns one row; non-null assert for test convenience
  // biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT … RETURNING
  return project!;
}

const USER_A = 'user_test_1';
const USER_B = 'user_test_2';

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------
describeIfTestDatabase('GET /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await guest('/api/projects');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });

  it('returns an empty array when the user has no projects', async () => {
    const res = await req(USER_A, '/api/projects');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it("returns only the current user's projects", async () => {
    await seedProject(USER_A, { name: 'A-Project' });
    await seedProject(USER_B, { name: 'B-Project' });

    const res = await req(USER_A, '/api/projects');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<typeof projects.$inferSelect>;
    expect(body[0]).toMatchObject({ name: 'A-Project', userId: USER_A });
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------
describeIfTestDatabase('POST /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await guest('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 422 when name is missing', async () => {
    const res = await req(USER_A, '/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string; errors: { field: string }[] };
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('returns 422 when name exceeds 100 chars', async () => {
    const res = await req(USER_A, '/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(101) }),
    });
    expect(res.status).toBe(422);
  });

  it('creates and returns the project on happy path', async () => {
    const res = await req(USER_A, '/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Project', description: 'Desc' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as typeof projects.$inferSelect;
    expect(body).toMatchObject({
      name: 'My Project',
      description: 'Desc',
      userId: USER_A,
      status: 'active',
    });
    expect(body.id).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id
// ---------------------------------------------------------------------------
describeIfTestDatabase('GET /api/projects/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const project = await seedProject(USER_A);
    const res = await guest(`/api/projects/${project.id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent project id', async () => {
    const res = await req(USER_A, '/api/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 404 for an invalid project id format', async () => {
    const res = await req(USER_A, '/api/projects/not-a-uuid');
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 403 when a different user tries to access the project', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_B, `/api/projects/${project.id}`);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns the project for the owning user', async () => {
    const project = await seedProject(USER_A, { name: 'Owner Project' });
    const res = await req(USER_A, `/api/projects/${project.id}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: project.id, name: 'Owner Project' });
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id
// ---------------------------------------------------------------------------
describeIfTestDatabase('PUT /api/projects/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const project = await seedProject(USER_A);
    const res = await guest(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent project id', async () => {
    const res = await req(USER_A, '/api/projects/00000000-0000-0000-0000-000000000000', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an invalid project id format', async () => {
    const res = await req(USER_A, '/api/projects/not-a-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when a different user tries to update', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_B, `/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Stolen Update' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 422 when validation fails', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_A, `/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(101) }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when no update fields are provided', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_A, `/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'body', message: 'At least one field must be provided for update' }],
    });
  });

  it('updates and returns the project on happy path', async () => {
    const project = await seedProject(USER_A, { name: 'Old Name' });
    const res = await req(USER_A, `/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', status: 'archived' }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: project.id,
      name: 'New Name',
      status: 'archived',
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------------
describeIfTestDatabase('DELETE /api/projects/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const project = await seedProject(USER_A);
    const res = await guest(`/api/projects/${project.id}`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent project id', async () => {
    const res = await req(USER_A, '/api/projects/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when a different user tries to delete', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_B, `/api/projects/${project.id}`, { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('deletes the project and returns 204 on happy path', async () => {
    const project = await seedProject(USER_A);
    const res = await req(USER_A, `/api/projects/${project.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    // Confirm it's gone
    const fetchRes = await req(USER_A, `/api/projects/${project.id}`);
    expect(fetchRes.status).toBe(404);
  });
});
