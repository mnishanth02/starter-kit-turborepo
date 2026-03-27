import type { CreateProjectInput, UpdateProjectInput } from '@starter/validation';
import { unwrapResponse } from '@/lib/api-errors';
import { getApiEnv } from '@/lib/env';

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

export async function listProjects(token?: string | null) {
  return unwrapResponse<Project[]>(
    await fetch(buildUrl('/api/projects'), {
      headers: getHeaders(token),
    }),
  );
}

export async function getProject(id: string, token?: string | null) {
  return unwrapResponse<Project>(
    await fetch(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
      headers: getHeaders(token),
    }),
  );
}

export async function createProject(input: CreateProjectInput, token?: string | null) {
  return unwrapResponse<Project>(
    await fetch(buildUrl('/api/projects'), {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    }),
  );
}

export async function updateProject(id: string, input: UpdateProjectInput, token?: string | null) {
  return unwrapResponse<Project>(
    await fetch(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
      method: 'PUT',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteProject(id: string, token?: string | null) {
  const response = await fetch(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
