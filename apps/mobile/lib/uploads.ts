import type {
  PaginatedResponse,
  UploadConfirmInput,
  UploadSessionRequest,
} from '@starter/validation';
import { unwrapResponse } from '@/lib/api-errors';
import { getApiEnv } from '@/lib/env';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

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

export async function listUploads(token?: string | null) {
  return unwrapResponse<PaginatedResponse<UploadRecord>>(
    await fetchWithTimeout(buildUrl('/api/uploads'), {
      headers: getHeaders(requireToken(token)),
    }),
  );
}

export async function createUploadSession(input: UploadSessionRequest, token?: string | null) {
  return unwrapResponse<UploadSession>(
    await fetchWithTimeout(buildUrl('/api/uploads/session'), {
      method: 'POST',
      headers: getHeaders(requireToken(token), true),
      body: JSON.stringify(input),
    }),
  );
}

export async function confirmUpload(id: string, input: UploadConfirmInput, token?: string | null) {
  return unwrapResponse<UploadRecord>(
    await fetchWithTimeout(buildUrl(`/api/uploads/${encodePathSegment(id)}/confirm`), {
      method: 'POST',
      headers: getHeaders(requireToken(token), true),
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteUpload(id: string, token?: string | null) {
  const response = await fetchWithTimeout(
    buildUrl(`/api/uploads/${encodePathSegment(id)}?deleteObject=true`),
    {
      method: 'DELETE',
      headers: getHeaders(requireToken(token)),
    },
  );

  if (!response.ok) {
    await unwrapResponse<never>(response);
  }
}
