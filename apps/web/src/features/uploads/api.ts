import type { UploadConfirmInput, UploadSessionRequest } from '@starter/validation';
import { getApiBaseUrl } from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-error';

export type UploadRecord = {
  id: string;
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'complete' | 'failed';
  createdAt: string;
  updatedAt: string;
};

export type UploadSession = {
  id: string;
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export const uploadsQueryKey = ['uploads'] as const;

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

export async function listUploads(headers?: HeadersInit) {
  return request<{ uploads: UploadRecord[] }>('/api/uploads', { headers });
}

export async function createUploadSession(input: UploadSessionRequest, headers?: HeadersInit) {
  return request<UploadSession>('/api/uploads/session', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function confirmUpload(id: string, input: UploadConfirmInput, headers?: HeadersInit) {
  return request<UploadRecord>(`/api/uploads/${encodePathSegment(id)}/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function deleteUpload(id: string, headers?: HeadersInit) {
  const response = await fetch(
    buildUrl(`/api/uploads/${encodePathSegment(id)}?deleteObject=true`),
    {
      method: 'DELETE',
      headers: normalizeHeaders(headers),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
