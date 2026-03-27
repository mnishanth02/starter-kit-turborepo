import type { UploadConfirmInput, UploadSessionRequest } from '@starter/validation';
import { unwrapResponse } from '@/lib/api-errors';
import { getApiEnv } from '@/lib/env';

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
  return `${getApiEnv().EXPO_PUBLIC_API_BASE_URL}${path}`;
}

function getHeaders(token?: string | null, hasBody?: boolean): Record<string, string> {
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listUploads(token?: string | null) {
  return unwrapResponse<{ uploads: UploadRecord[] }>(
    await fetch(buildUrl('/api/uploads'), {
      headers: getHeaders(token),
    }),
  );
}

export async function createUploadSession(input: UploadSessionRequest, token?: string | null) {
  return unwrapResponse<UploadSession>(
    await fetch(buildUrl('/api/uploads/session'), {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    }),
  );
}

export async function confirmUpload(id: string, input: UploadConfirmInput, token?: string | null) {
  return unwrapResponse<UploadRecord>(
    await fetch(buildUrl(`/api/uploads/${id}/confirm`), {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteUpload(id: string, token?: string | null) {
  const response = await fetch(buildUrl(`/api/uploads/${id}?deleteObject=true`), {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
