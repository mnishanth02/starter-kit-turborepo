import type { AppType } from '@starter/api';
import { hc } from 'hono/client';

// basePath('/api') is already in AppType — pass origin only to avoid double prefix
export const api = hc<AppType>('');
