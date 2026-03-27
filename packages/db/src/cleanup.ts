import { and, eq, lt } from 'drizzle-orm';
import { db } from './client';
import { uploads } from './schema';

async function cleanup() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const deleted = await db
    .delete(uploads)
    .where(and(eq(uploads.status, 'pending'), lt(uploads.createdAt, oneHourAgo)))
    .returning({ id: uploads.id });

  console.log(`[db:cleanup] Deleted ${deleted.length} stale pending upload(s)`);
}

cleanup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db:cleanup] Failed:', err);
    process.exit(1);
  });
