import { db, uploads as uploadsTable } from '@starter/db';
import {
  ErrorCode,
  paginationQuery,
  uploadConfirmInput,
  uploadSessionRequest,
} from '@starter/validation';
import { and, count, desc, eq, gte, ne, or } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';

import { apiError, validationError } from '../lib/errors';
import {
  createSignedUploadUrl,
  deleteObject,
  headObject,
  SIGNED_UPLOAD_TTL_SECONDS,
} from '../lib/storage';
import { requireAuth } from '../middleware/auth';
import { withRateLimit } from '../middleware/ratelimit';

export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const STALE_PENDING_WINDOW_MS = 60 * 60 * 1000;

function sanitizeFilename(filename: string): string {
  const normalized = filename.split(/[\\/]/).pop()?.trim() || 'upload';
  return (
    normalized
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120) || 'upload'
  );
}

function createObjectKey(userId: string, uploadId: string, filename: string): string {
  return `uploads/${userId}/${uploadId}/${sanitizeFilename(filename)}`;
}

async function parseJson(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

const uploads = new Hono()
  .use('*', requireAuth)
  // POST /uploads/session — initiate an upload (10 req/min)
  .post('/session', withRateLimit('uploads:session', 10, '1 m'), async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const body = await parseJson(c);
    if (body === null) {
      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const parsed = uploadSessionRequest.safeParse(body);
    if (!parsed.success) {
      return validationError(c, parsed.error);
    }

    if (parsed.data.sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        { field: 'sizeBytes', message: 'File size must be 50MB or less' },
      ]);
    }

    const uploadId = crypto.randomUUID();
    const objectKey = createObjectKey(auth.userId, uploadId, parsed.data.filename);

    await db.insert(uploadsTable).values({
      id: uploadId,
      userId: auth.userId,
      objectKey,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      status: 'pending',
    });

    let uploadUrl: string;
    try {
      uploadUrl = await createSignedUploadUrl(objectKey, parsed.data.contentType);
    } catch (error) {
      await db
        .delete(uploadsTable)
        .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)));
      throw error;
    }

    return c.json({
      id: uploadId,
      objectKey,
      uploadUrl,
      expiresInSeconds: SIGNED_UPLOAD_TTL_SECONDS,
    });
  })
  .post('/:id/confirm', async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const body = await parseJson(c);
    if (body === null) {
      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const parsed = uploadConfirmInput.safeParse(body);
    if (!parsed.success) {
      return validationError(c, parsed.error);
    }

    const uploadId = c.req.param('id');
    const [uploadRecord] = await db
      .select()
      .from(uploadsTable)
      .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)))
      .limit(1);

    if (!uploadRecord) {
      return apiError(c, ErrorCode.NOT_FOUND, 'Upload not found');
    }

    if (uploadRecord.status !== 'pending') {
      return apiError(c, ErrorCode.CONFLICT, 'Upload has already been processed');
    }

    if (uploadRecord.objectKey !== parsed.data.objectKey) {
      return apiError(
        c,
        ErrorCode.CONFLICT,
        'Upload session does not match the provided object key',
      );
    }

    const objectMetadata = await headObject(uploadRecord.objectKey);
    if (!objectMetadata) {
      return apiError(c, ErrorCode.NOT_FOUND, 'Uploaded object not found');
    }

    if (objectMetadata.contentLength === null) {
      return apiError(c, ErrorCode.INTERNAL_ERROR, 'Uploaded object metadata is incomplete');
    }

    if (objectMetadata.contentLength > MAX_UPLOAD_SIZE_BYTES) {
      await deleteObject(uploadRecord.objectKey);
      await db
        .update(uploadsTable)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)));

      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        { field: 'sizeBytes', message: 'Uploaded object exceeds the 50MB limit' },
      ]);
    }

    if (objectMetadata.contentLength !== uploadRecord.sizeBytes) {
      await deleteObject(uploadRecord.objectKey);
      await db
        .update(uploadsTable)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)));

      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        {
          field: 'sizeBytes',
          message: 'Uploaded object size does not match the requested upload session',
        },
      ]);
    }

    const [confirmedUpload] = await db
      .update(uploadsTable)
      .set({
        status: 'complete',
        sizeBytes: objectMetadata.contentLength,
        contentType: objectMetadata.contentType ?? uploadRecord.contentType,
        updatedAt: new Date(),
      })
      .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)))
      .returning();

    if (!confirmedUpload) {
      return apiError(c, ErrorCode.INTERNAL_ERROR, 'Upload confirmation could not be persisted');
    }

    return c.json({
      id: confirmedUpload.id,
      objectKey: confirmedUpload.objectKey,
      filename: confirmedUpload.filename,
      contentType: confirmedUpload.contentType,
      sizeBytes: confirmedUpload.sizeBytes,
      status: confirmedUpload.status,
      createdAt: confirmedUpload.createdAt,
      updatedAt: confirmedUpload.updatedAt,
    });
  })
  // GET /uploads — list current user's uploads (supports ?page=1&limit=20)
  .get('/', async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const parsedPage = paginationQuery.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });
    const { page, limit } = parsedPage.success ? parsedPage.data : { page: 1, limit: 20 };
    const offset = (page - 1) * limit;

    const stalePendingCutoff = new Date(Date.now() - STALE_PENDING_WINDOW_MS);
    const whereClause = and(
      eq(uploadsTable.userId, auth.userId),
      or(ne(uploadsTable.status, 'pending'), gte(uploadsTable.createdAt, stalePendingCutoff)),
    );

    const [totalRow] = await db.select({ total: count() }).from(uploadsTable).where(whereClause);

    const records = await db
      .select()
      .from(uploadsTable)
      .where(whereClause)
      .orderBy(desc(uploadsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const total = totalRow?.total ?? 0;
    return c.json({
      data: records.map((record) => ({
        id: record.id,
        objectKey: record.objectKey,
        filename: record.filename,
        contentType: record.contentType,
        sizeBytes: record.sizeBytes,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  })
  .delete('/:id', async (c) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      return apiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const deleteObjectParam = c.req.query('deleteObject');
    if (deleteObjectParam && !['true', 'false'].includes(deleteObjectParam)) {
      return apiError(c, ErrorCode.VALIDATION_ERROR, 'Validation failed', [
        {
          field: 'deleteObject',
          message: 'deleteObject must be either "true" or "false"',
        },
      ]);
    }

    const shouldDeleteObject = deleteObjectParam !== 'false';
    const uploadId = c.req.param('id');
    const [uploadRecord] = await db
      .select()
      .from(uploadsTable)
      .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)))
      .limit(1);

    if (!uploadRecord) {
      return apiError(c, ErrorCode.NOT_FOUND, 'Upload not found');
    }

    if (shouldDeleteObject) {
      await deleteObject(uploadRecord.objectKey);
    }

    await db
      .delete(uploadsTable)
      .where(and(eq(uploadsTable.id, uploadId), eq(uploadsTable.userId, auth.userId)));

    return c.json({
      id: uploadId,
      deleted: true,
      objectDeleted: shouldDeleteObject,
    });
  });

export { uploads };
