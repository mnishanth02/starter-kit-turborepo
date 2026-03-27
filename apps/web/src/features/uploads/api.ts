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

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  return unwrapResponse<T>(response);
}

export async function listUploads() {
  return request<{ uploads: UploadRecord[] }>('/api/uploads');
}

export async function createUploadSession(input: UploadSessionRequest) {
  return request<UploadSession>('/api/uploads/session', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function confirmUpload(id: string, input: UploadConfirmInput) {
  return request<UploadRecord>(`/api/uploads/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteUpload(id: string) {
  const response = await fetch(buildUrl(`/api/uploads/${id}?deleteObject=true`), {
    method: 'DELETE',
    cache: 'no-store',
  });

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
