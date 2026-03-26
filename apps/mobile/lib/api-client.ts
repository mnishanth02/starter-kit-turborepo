import type { AppType } from '@starter/api';
import { hc } from 'hono/client';

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }
  return url;
}

// Auth token must be added per-request since it's async (Clerk session refresh).
// Use getApiClient(token) for authenticated requests.
export function getApiClient(token?: string | null) {
  return hc<AppType>(getBaseUrl(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
