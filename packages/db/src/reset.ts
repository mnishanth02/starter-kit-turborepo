import { sql } from 'drizzle-orm';
import { db } from './client';
import { loadDbEnv } from './load-env';

loadDbEnv();

async function reset() {
  if (process.env.ALLOW_DB_RESET !== 'true') {
    console.error('❌ Refusing to reset database.');
    console.error('   Set ALLOW_DB_RESET=true to confirm.');
    process.exit(1);
  }

  console.log('🗑️  Resetting database...');

  // Drop and recreate public schema
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);

  console.log('✅ Schema dropped and recreated.');
  console.log('   Run `pnpm db:migrate` then `pnpm db:seed` to repopulate.');
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  });
