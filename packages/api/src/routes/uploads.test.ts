import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ErrorCode } from '@starter/validation';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UploadRecord = {
  id: string;
  userId: string;
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'complete' | 'failed';
  createdAt: Date;
  updatedAt: Date;
};

type Condition =
  | { type: 'eq'; field: keyof UploadRecord; value: unknown }
  | { type: 'ne'; field: keyof UploadRecord; value: unknown }
  | { type: 'gte'; field: keyof UploadRecord; value: unknown }
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] };

type SortDescriptor = { type: 'desc'; field: keyof UploadRecord };

class SelectBuilder extends Promise<UploadRecord[]> {
  static get [Symbol.species]() {
    return Promise;
  }

  private order: SortDescriptor | undefined;
  private limitValue: number | undefined;
  private offsetValue = 0;
  private readonly runQuery: () => UploadRecord[];
  private readonly sortResults: (
    input: UploadRecord[],
    descriptor?: SortDescriptor,
  ) => UploadRecord[];

  constructor(
    runQuery: () => UploadRecord[],
    sortResults: (input: UploadRecord[], descriptor?: SortDescriptor) => UploadRecord[],
  ) {
    let resolvePromise!: (value: UploadRecord[]) => void;

    super((resolve) => {
      resolvePromise = resolve;
    });

    this.runQuery = runQuery;
    this.sortResults = sortResults;

    queueMicrotask(() => {
      resolvePromise(this.execute());
    });
  }

  orderBy(descriptor: SortDescriptor) {
    this.order = descriptor;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  offset(value: number) {
    this.offsetValue = value;
    return this;
  }

  private execute(): UploadRecord[] {
    let result = this.runQuery();
    if (this.order) result = this.sortResults(result, this.order);
    if (this.offsetValue) result = result.slice(this.offsetValue);
    if (this.limitValue !== undefined) result = result.slice(0, this.limitValue);
    return result;
  }
}

const mockState = vi.hoisted(() => {
  const records = new Map<string, UploadRecord>();

  const uploadsTable = {
    id: 'id',
    userId: 'userId',
    objectKey: 'objectKey',
    filename: 'filename',
    contentType: 'contentType',
    sizeBytes: 'sizeBytes',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  } as const;

  const cloneRecord = (record: UploadRecord): UploadRecord => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  });

  const normalizeRecord = (
    input: Partial<UploadRecord> &
      Pick<UploadRecord, 'id' | 'userId' | 'objectKey' | 'filename' | 'contentType' | 'sizeBytes'>,
  ): UploadRecord => {
    const createdAt = input.createdAt ?? new Date();
    const updatedAt = input.updatedAt ?? createdAt;

    return {
      id: input.id,
      userId: input.userId,
      objectKey: input.objectKey,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      status: input.status ?? 'pending',
      createdAt,
      updatedAt,
    };
  };

  const matches = (condition: Condition | undefined, record: UploadRecord): boolean => {
    if (!condition) {
      return true;
    }

    switch (condition.type) {
      case 'eq':
        return record[condition.field] === condition.value;
      case 'ne':
        return record[condition.field] !== condition.value;
      case 'gte':
        return record[condition.field] >= (condition.value as UploadRecord[keyof UploadRecord]);
      case 'and':
        return condition.conditions.every((child) => matches(child, record));
      case 'or':
        return condition.conditions.some((child) => matches(child, record));
    }
  };

  const findRecords = (condition?: Condition): UploadRecord[] =>
    Array.from(records.values())
      .filter((record) => matches(condition, record))
      .map(cloneRecord);

  const sortRecords = (input: UploadRecord[], descriptor?: SortDescriptor): UploadRecord[] => {
    if (!descriptor) {
      return input;
    }

    return [...input].sort((left, right) => {
      const leftValue = left[descriptor.field];
      const rightValue = right[descriptor.field];

      if (leftValue === rightValue) {
        return 0;
      }

      return leftValue > rightValue ? -1 : 1;
    });
  };

  // biome-ignore lint/suspicious/noExplicitAny: test mock needs flexible select signature
  const db: any = {
    select: (fields?: Record<string, unknown>) => {
      const isCount = fields !== undefined;
      return {
        from: () => ({
          where: (condition: Condition) => {
            if (isCount) {
              return Promise.resolve([{ total: findRecords(condition).length }]);
            }

            return new SelectBuilder(() => findRecords(condition), sortRecords);
          },
        }),
      };
    },
    insert: () => ({
      values: async (value: UploadRecord | UploadRecord[]) => {
        const incoming = Array.isArray(value) ? value : [value];
        const inserted = incoming.map((record) => normalizeRecord(record));
        for (const record of inserted) {
          records.set(record.id, record);
        }
        return inserted.map(cloneRecord);
      },
    }),
    update: () => ({
      set: (updates: Partial<UploadRecord>) => ({
        where: (condition: Condition) => {
          const updated = findRecords(condition).map((record) => {
            const next = normalizeRecord({
              ...record,
              ...updates,
              updatedAt: updates.updatedAt ?? record.updatedAt,
            });
            records.set(next.id, next);
            return cloneRecord(next);
          });

          return {
            returning: async () => updated.map(cloneRecord),
          };
        },
      }),
    }),
    delete: () => ({
      where: async (condition: Condition) => {
        for (const record of findRecords(condition)) {
          records.delete(record.id);
        }
        return [];
      },
    }),
  };

  const seed = (
    input: Partial<UploadRecord> &
      Pick<UploadRecord, 'id' | 'userId' | 'objectKey' | 'filename' | 'contentType' | 'sizeBytes'>,
  ): UploadRecord => {
    const record = normalizeRecord(input);
    records.set(record.id, record);
    return cloneRecord(record);
  };

  return {
    db,
    reset: () => records.clear(),
    seed,
    getById: (id: string) => {
      const record = records.get(id);
      return record ? cloneRecord(record) : undefined;
    },
    uploadsTable,
  };
});

vi.mock('drizzle-orm', () => ({
  and: (...conditions: Condition[]) => ({ type: 'and', conditions }),
  count: () => '__count__',
  desc: (field: keyof UploadRecord) => ({ type: 'desc', field }),
  eq: (field: keyof UploadRecord, value: unknown) => ({ type: 'eq', field, value }),
  gte: (field: keyof UploadRecord, value: unknown) => ({ type: 'gte', field, value }),
  ne: (field: keyof UploadRecord, value: unknown) => ({ type: 'ne', field, value }),
  or: (...conditions: Condition[]) => ({ type: 'or', conditions }),
}));

vi.mock('@starter/db', () => ({
  db: mockState.db,
  uploads: mockState.uploadsTable,
}));

vi.mock('@starter/db/testing', () => ({
  truncateTestTables: async () => {
    mockState.reset();
  },
}));

import { apiError, globalErrorHandler } from '../lib/errors';
import { clerkAuthMiddleware } from '../middleware/clerk';
import { getR2Object } from '../test/mocks/r2';
import { authenticateAs, authenticateAsGuest } from '../test/request';
import { MAX_UPLOAD_SIZE_BYTES, uploads } from './uploads';

type UploadSessionResponse = {
  id: string;
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

type UploadListResponse = {
  data: Array<{
    id: string;
    objectKey: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    status: 'pending' | 'complete' | 'failed';
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const testApp = new Hono().basePath('/api');
testApp.onError(globalErrorHandler);
testApp.notFound((c) => apiError(c, ErrorCode.NOT_FOUND, 'Route not found'));
testApp.use('*', clerkAuthMiddleware);
testApp.route('/uploads', uploads);

async function requestAs(userId: string, path: string, init?: RequestInit) {
  authenticateAs(userId);
  return testApp.request(path, init);
}

async function requestAsGuest(path: string, init?: RequestInit) {
  authenticateAsGuest();
  return testApp.request(path, init);
}

async function uploadObject(objectKey: string, body: string | Uint8Array, contentType: string) {
  const client = new S3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

describe('upload routes', () => {
  beforeEach(() => {
    mockState.reset();
  });

  afterEach(() => {
    mockState.reset();
  });

  it('creates an authenticated upload session and stores pending metadata', async () => {
    const response = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 1024,
      }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as UploadSessionResponse;
    expect(payload).toMatchObject({
      id: expect.any(String),
      objectKey: expect.stringContaining('uploads/user_test_1/'),
      uploadUrl: expect.stringContaining('/test-bucket'),
      expiresInSeconds: 300,
    });

    expect(mockState.getById(payload.id)).toMatchObject({
      id: payload.id,
      userId: 'user_test_1',
      objectKey: payload.objectKey,
      filename: 'avatar.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      status: 'pending',
    });
  });

  it('rejects upload sessions over the 50MB limit', async () => {
    const response = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'large.bin',
        contentType: 'application/octet-stream',
        sizeBytes: MAX_UPLOAD_SIZE_BYTES + 1,
      }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: [{ field: 'sizeBytes', message: 'File size must be 50MB or less' }],
    });
  });

  it('confirms an uploaded object and marks the record complete', async () => {
    const sessionResponse = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 4,
      }),
    });
    const session = (await sessionResponse.json()) as UploadSessionResponse;

    await uploadObject(session.objectKey, new Uint8Array([1, 2, 3, 4]), 'image/png');

    const confirmResponse = await requestAs('user_test_1', `/api/uploads/${session.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objectKey: session.objectKey }),
    });

    expect(confirmResponse.status).toBe(200);
    await expect(confirmResponse.json()).resolves.toMatchObject({
      id: session.id,
      objectKey: session.objectKey,
      contentType: 'image/png',
      sizeBytes: 4,
      status: 'complete',
    });
    expect(mockState.getById(session.id)?.status).toBe('complete');
  });

  it('rejects confirming an upload that is no longer pending', async () => {
    const sessionResponse = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 4,
      }),
    });
    const session = (await sessionResponse.json()) as UploadSessionResponse;

    await uploadObject(session.objectKey, new Uint8Array([1, 2, 3, 4]), 'image/png');

    const firstConfirmResponse = await requestAs(
      'user_test_1',
      `/api/uploads/${session.id}/confirm`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectKey: session.objectKey }),
      },
    );

    expect(firstConfirmResponse.status).toBe(200);

    const secondConfirmResponse = await requestAs(
      'user_test_1',
      `/api/uploads/${session.id}/confirm`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectKey: session.objectKey }),
      },
    );

    expect(secondConfirmResponse.status).toBe(409);
    await expect(secondConfirmResponse.json()).resolves.toMatchObject({
      code: 'CONFLICT',
      message: 'Upload has already been processed',
    });
  });

  it('rejects oversized uploaded objects, deletes them from R2, and marks the record failed', async () => {
    const sessionResponse = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'video.mp4',
        contentType: 'video/mp4',
        sizeBytes: 1024,
      }),
    });
    const session = (await sessionResponse.json()) as UploadSessionResponse;

    await uploadObject(session.objectKey, new Uint8Array(MAX_UPLOAD_SIZE_BYTES + 1), 'video/mp4');

    const confirmResponse = await requestAs('user_test_1', `/api/uploads/${session.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objectKey: session.objectKey }),
    });

    expect(confirmResponse.status).toBe(422);
    await expect(confirmResponse.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: [{ field: 'sizeBytes', message: 'Uploaded object exceeds the 50MB limit' }],
    });
    expect(getR2Object('test-bucket', session.objectKey)).toBeUndefined();
    expect(mockState.getById(session.id)?.status).toBe('failed');
  });

  it('rejects uploaded objects whose size does not match the requested session', async () => {
    const sessionResponse = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 4,
      }),
    });
    const session = (await sessionResponse.json()) as UploadSessionResponse;

    await uploadObject(session.objectKey, new Uint8Array([1, 2, 3]), 'image/png');

    const confirmResponse = await requestAs('user_test_1', `/api/uploads/${session.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objectKey: session.objectKey }),
    });

    expect(confirmResponse.status).toBe(422);
    await expect(confirmResponse.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: [
        {
          field: 'sizeBytes',
          message: 'Uploaded object size does not match the requested upload session',
        },
      ],
    });
    expect(getR2Object('test-bucket', session.objectKey)).toBeUndefined();
    expect(mockState.getById(session.id)?.status).toBe('failed');
  });

  it('lists only the current user uploads and filters stale pending records', async () => {
    const staleCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mockState.seed({
      id: crypto.randomUUID(),
      userId: 'user_test_1',
      objectKey: 'uploads/user_test_1/stale/old.png',
      filename: 'old.png',
      contentType: 'image/png',
      sizeBytes: 10,
      status: 'pending',
      createdAt: staleCreatedAt,
      updatedAt: staleCreatedAt,
    });
    mockState.seed({
      id: crypto.randomUUID(),
      userId: 'user_test_1',
      objectKey: 'uploads/user_test_1/fresh/new.png',
      filename: 'new.png',
      contentType: 'image/png',
      sizeBytes: 12,
      status: 'pending',
    });
    mockState.seed({
      id: crypto.randomUUID(),
      userId: 'user_test_1',
      objectKey: 'uploads/user_test_1/complete/done.png',
      filename: 'done.png',
      contentType: 'image/png',
      sizeBytes: 14,
      status: 'complete',
      createdAt: staleCreatedAt,
      updatedAt: staleCreatedAt,
    });
    mockState.seed({
      id: crypto.randomUUID(),
      userId: 'user_test_2',
      objectKey: 'uploads/user_test_2/other.png',
      filename: 'other.png',
      contentType: 'image/png',
      sizeBytes: 16,
      status: 'complete',
    });

    const response = await requestAs('user_test_1', '/api/uploads');

    expect(response.status).toBe(200);
    const payload = (await response.json()) as UploadListResponse;
    expect(payload).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ filename: 'new.png', status: 'pending' }),
        expect.objectContaining({ filename: 'done.png', status: 'complete' }),
      ]),
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(payload.data).toHaveLength(2);
    expect(payload.data.map((upload) => upload.filename)).not.toContain('old.png');
    expect(payload.data.map((upload) => upload.filename)).not.toContain('other.png');
  });

  it('deletes upload metadata and the stored object by default', async () => {
    const sessionResponse = await requestAs('user_test_1', '/api/uploads/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 4,
      }),
    });
    const session = (await sessionResponse.json()) as UploadSessionResponse;

    await uploadObject(session.objectKey, new Uint8Array([1, 2, 3, 4]), 'image/png');

    const response = await requestAs('user_test_1', `/api/uploads/${session.id}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: session.id,
      deleted: true,
      objectDeleted: true,
    });
    expect(getR2Object('test-bucket', session.objectKey)).toBeUndefined();
    expect(mockState.getById(session.id)).toBeUndefined();
  });

  it('returns the standard unauthorized contract for guests', async () => {
    const response = await requestAsGuest('/api/uploads');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });
});
