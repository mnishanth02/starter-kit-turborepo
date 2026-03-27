/**
 * Tests for the API layer helpers — projects & uploads.
 *
 * We mock fetchWithTimeout so no real HTTP calls are made,
 * and we verify the correct URLs, headers, and bodies are constructed.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(),
}));

const mockFetch = fetchWithTimeout as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('projects API', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const projects = require('@/lib/projects');

  it('listProjects sends GET with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await projects.listProjects('tok_123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/projects');
    expect(opts.headers.Authorization).toBe('Bearer tok_123');
  });

  it('createProject sends POST with JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'p1', name: 'New' }),
    });

    await projects.createProject({ name: 'New' }, 'tok_123');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/projects');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ name: 'New' });
  });

  it('listProjects throws SESSION_EXPIRED when token is null', async () => {
    await expect(projects.listProjects(null)).rejects.toThrow('SESSION_EXPIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('listProjects throws SESSION_EXPIRED when token is undefined', async () => {
    await expect(projects.listProjects(undefined)).rejects.toThrow('SESSION_EXPIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('uploads API', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const uploads = require('@/lib/uploads');

  it('listUploads sends GET with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await uploads.listUploads('tok_abc');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/uploads');
    expect(opts.headers.Authorization).toBe('Bearer tok_abc');
  });

  it('listUploads throws SESSION_EXPIRED without a token', async () => {
    await expect(uploads.listUploads(null)).rejects.toThrow('SESSION_EXPIRED');
  });
});
