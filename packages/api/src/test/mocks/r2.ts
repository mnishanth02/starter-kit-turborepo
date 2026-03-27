type StoredObject = {
  bucket: string;
  key: string;
  body: unknown;
  contentType: string | null;
  contentLength: number;
};

type CommandInput = {
  Bucket?: string;
  Key?: string;
  Body?: unknown;
  ContentType?: string;
};

const buckets = new Map<string, Map<string, StoredObject>>();

function getBucket(bucketName: string): Map<string, StoredObject> {
  const bucket = buckets.get(bucketName);
  if (bucket) {
    return bucket;
  }

  const nextBucket = new Map<string, StoredObject>();
  buckets.set(bucketName, nextBucket);
  return nextBucket;
}

function getObjectSize(body: unknown): number {
  if (typeof body === 'string') {
    return Buffer.byteLength(body);
  }

  if (body instanceof Uint8Array) {
    return body.byteLength;
  }

  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }

  return 0;
}

class MockCommand {
  constructor(readonly input: CommandInput = {}) {}
}

class S3Client {
  async send(command: MockCommand) {
    const bucketName = command.input.Bucket ?? 'test-bucket';
    const objectKey = command.input.Key ?? '';
    const bucket = getBucket(bucketName);

    if (command instanceof PutObjectCommand) {
      bucket.set(objectKey, {
        bucket: bucketName,
        key: objectKey,
        body: command.input.Body ?? null,
        contentType: command.input.ContentType ?? null,
        contentLength: getObjectSize(command.input.Body),
      });
      return {};
    }

    if (command instanceof DeleteObjectCommand) {
      bucket.delete(objectKey);
      return {};
    }

    if (command instanceof HeadObjectCommand) {
      const object = bucket.get(objectKey);
      if (!object) {
        const error = new Error(`Object ${objectKey} not found`) as Error & { name: string };
        error.name = 'NotFound';
        throw error;
      }

      return {
        ContentLength: object.contentLength,
        ContentType: object.contentType,
      };
    }

    if (command instanceof GetObjectCommand) {
      const object = bucket.get(objectKey);
      if (!object) {
        const error = new Error(`Object ${objectKey} not found`) as Error & { name: string };
        error.name = 'NoSuchKey';
        throw error;
      }

      return {
        Body: object.body,
      };
    }

    return {};
  }
}

export class PutObjectCommand extends MockCommand {}
export class DeleteObjectCommand extends MockCommand {}
export class HeadObjectCommand extends MockCommand {}
export class GetObjectCommand extends MockCommand {}

export function resetR2Mock(): void {
  buckets.clear();
}

export function getR2Object(bucketName: string, objectKey: string): StoredObject | undefined {
  return buckets.get(bucketName)?.get(objectKey);
}

export function createS3ClientMock() {
  return {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
  };
}

export function createS3PresignerMock() {
  return {
    getSignedUrl: async (_client: S3Client, command: MockCommand) => {
      const bucketName = command.input.Bucket ?? 'test-bucket';
      const objectKey = command.input.Key ?? 'object';
      return `https://r2.mock/${bucketName}/${objectKey}`;
    },
  };
}
