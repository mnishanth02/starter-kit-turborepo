import type { AppType } from '@starter/api';
import { hc } from 'hono/client';

// Absolute URL for SSR (Server Components), relative for browser.
// basePath('/api') is encoded in AppType — routes resolve to /api/*.
const baseUrl =
  typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000') : '';

export const api = hc<AppType>(baseUrl);
