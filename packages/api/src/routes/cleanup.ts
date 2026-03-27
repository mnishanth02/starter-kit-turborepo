import { db, uploads } from '@starter/db';
import { and, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';

import { deleteObject } from '../lib/storage';

const STALE_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export const cleanupRoute = new Hono().post('/uploads/stale', async (c) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || c.req.header('Authorization') !== `Bearer ${cronSecret}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const staleCutoff = new Date(Date.now() - STALE_PENDING_TTL_MS);
  const staleRecords = await db
    .select({ id: uploads.id, objectKey: uploads.objectKey })
    .from(uploads)
    .where(and(eq(uploads.status, 'pending'), lt(uploads.createdAt, staleCutoff)));

  let deleted = 0;
  let storageErrors = 0;
  for (const record of staleRecords) {
    try {
      await deleteObject(record.objectKey);
    } catch {
      storageErrors++;
    }
    await db.delete(uploads).where(eq(uploads.id, record.id));
    deleted++;
  }

  return c.json({ deleted, storageErrors, total: staleRecords.length });
});
