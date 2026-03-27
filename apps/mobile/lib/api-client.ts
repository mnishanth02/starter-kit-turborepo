import type { AppType } from '@starter/api';
import { hc } from 'hono/client';
import { getApiEnv } from '@/lib/env';

function getBaseUrl(): string {
  return getApiEnv().EXPO_PUBLIC_API_BASE_URL;
}

// Auth token must be added per-request since it's async (Clerk session refresh).
// Use getApiClient(token) for authenticated requests.
export function getApiClient(token?: string | null) {
  return hc<AppType>(getBaseUrl(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
