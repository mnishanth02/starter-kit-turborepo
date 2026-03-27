import type {
  CreateProjectInput,
  PaginatedResponse,
  UpdateProjectInput,
} from '@starter/validation';
import { unwrapResponse } from '@/lib/api-errors';
import { getApiEnv } from '@/lib/env';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export const projectsQueryKey = ['projects'] as const;
export const projectQueryKey = (id: string) => ['projects', id] as const;

function buildUrl(path: string) {
  return `${getApiEnv().EXPO_PUBLIC_API_BASE_URL}${path}`;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function getHeaders(token?: string | null, hasBody?: boolean): Record<string, string> {
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Throws if the Clerk token is null (session expired). */
function requireToken(token: string | null | undefined): string {
  if (!token) throw new Error('SESSION_EXPIRED');
  return token;
}

export async function listProjects(token?: string | null) {
  return unwrapResponse<PaginatedResponse<Project>>(
    await fetchWithTimeout(buildUrl('/api/projects'), {
      headers: getHeaders(requireToken(token)),
    }),
  );
}

export async function getProject(id: string, token?: string | null) {
  return unwrapResponse<Project>(
    await fetchWithTimeout(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
      headers: getHeaders(requireToken(token)),
    }),
  );
}

export async function createProject(input: CreateProjectInput, token?: string | null) {
  return unwrapResponse<Project>(
    await fetchWithTimeout(buildUrl('/api/projects'), {
      method: 'POST',
      headers: getHeaders(requireToken(token), true),
      body: JSON.stringify(input),
    }),
  );
}

export async function updateProject(id: string, input: UpdateProjectInput, token?: string | null) {
  return unwrapResponse<Project>(
    await fetchWithTimeout(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
      method: 'PUT',
      headers: getHeaders(requireToken(token), true),
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteProject(id: string, token?: string | null) {
  const response = await fetchWithTimeout(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
    method: 'DELETE',
    headers: getHeaders(requireToken(token)),
  });

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
