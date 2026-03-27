import { describe, expect, it } from 'vitest';

import { requestAs, requestAsGuest } from '../test/request';

describe('GET /api/me', () => {
  it('returns the standardized unauthorized payload when no auth is present', async () => {
    const response = await requestAsGuest('/api/me');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });

  it('returns the mocked Clerk user for authenticated requests', async () => {
    const response = await requestAs('user_test_1', '/api/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: 'user_test_1',
      email: 'user_test_1@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
  });
});
