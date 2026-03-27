// Server-only — do not import in client bundles (exposes DATABASE_URL)
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

export function isTestEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'test' || env.VITEST === 'true' || env.VITEST === '1';
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();

  if (isTestEnvironment(env) && testDatabaseUrl) {
    return testDatabaseUrl;
  }

  if (databaseUrl) {
    return databaseUrl;
  }

  return null;
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL environment variable is required');
}

const neonClient = neon(databaseUrl);

export const db = drizzle(neonClient, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    await neonClient`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
