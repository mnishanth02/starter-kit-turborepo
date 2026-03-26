// Server-only — do not import in client bundles (exposes DATABASE_URL)
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
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
