import { db, uploads } from '@starter/db';
import { ErrorCode } from '@starter/validation';
import { and, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';

import { apiError } from '../lib/errors';
import { deleteObject } from '../lib/storage';

const STALE_PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export const cleanupRoute = new Hono().post('/uploads/stale', async (c) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || c.req.header('Authorization') !== `Bearer ${cronSecret}`) {
    return apiError(c, ErrorCode.UNAUTHORIZED, 'Unauthorized');
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
      await db.delete(uploads).where(eq(uploads.id, record.id));
      deleted++;
    } catch {
      storageErrors++;
    }
  }

  return c.json({ deleted, storageErrors, total: staleRecords.length });
});
