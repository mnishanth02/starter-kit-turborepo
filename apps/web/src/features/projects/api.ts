import type {
  CreateProjectInput,
  PaginatedResponse,
  UpdateProjectInput,
} from '@starter/validation';
import { getApiBaseUrl } from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-error';

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
  return `${getApiBaseUrl()}${path}`;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  return Object.fromEntries(new Headers(headers).entries());
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...normalizeHeaders(init?.headers),
    },
    cache: 'no-store',
  });

  return unwrapResponse<T>(response);
}

export async function listProjects(headers?: HeadersInit) {
  return request<PaginatedResponse<Project>>('/api/projects', { headers });
}

export async function getProject(id: string, headers?: HeadersInit) {
  return request<Project>(`/api/projects/${encodePathSegment(id)}`, { headers });
}

export async function createProject(input: CreateProjectInput) {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return request<Project>(`/api/projects/${encodePathSegment(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string, headers?: HeadersInit) {
  const response = await fetch(buildUrl(`/api/projects/${encodePathSegment(id)}`), {
    method: 'DELETE',
    headers: normalizeHeaders(headers),
    cache: 'no-store',
  });

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
