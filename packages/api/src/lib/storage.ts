import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const SIGNED_UPLOAD_TTL_SECONDS = 60 * 5;

type StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
  publicUrl: string | null;
};

export type StoredObjectMetadata = {
  contentLength: number | null;
  contentType: string | null;
};

let storageConfig: StorageConfig | null = null;
let storageClient: S3Client | null = null;

function resolveStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  if (storageConfig) {
    return storageConfig;
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = env.CLOUDFLARE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CLOUDFLARE_SECRET_ACCESS_KEY?.trim();
  const bucketName = env.R2_BUCKET_NAME?.trim();
  const endpoint =
    env.R2_ENDPOINT?.trim() ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const publicUrl = env.R2_PUBLIC_URL?.trim() || null;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error(
      'Cloudflare R2 storage requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, and R2_BUCKET_NAME',
    );
  }

  storageConfig = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicUrl,
    region: env.R2_REGION?.trim() || 'auto',
  };

  return storageConfig;
}

export function getStorageClient(): S3Client {
  if (storageClient) {
    return storageClient;
  }

  const config = resolveStorageConfig();
  storageClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return storageClient;
}

export function getStorageBucketName(): string {
  return resolveStorageConfig().bucketName;
}

export function getStoragePublicUrl(): string | null {
  return resolveStorageConfig().publicUrl;
}

export async function createSignedUploadUrl(key: string, contentType: string): Promise<string> {
  if (!key.trim()) {
    throw new Error('Storage object key is required');
  }

  if (!contentType.trim()) {
    throw new Error('Storage content type is required');
  }

  return getSignedUrl(
    getStorageClient(),
    new PutObjectCommand({
      Bucket: getStorageBucketName(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: SIGNED_UPLOAD_TTL_SECONDS },
  );
}

export async function deleteObject(key: string): Promise<void> {
  if (!key.trim()) {
    return;
  }

  await getStorageClient().send(
    new DeleteObjectCommand({
      Bucket: getStorageBucketName(),
      Key: key,
    }),
  );
}

function isObjectNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const name = 'name' in error ? error.name : null;
  const metadata =
    '$metadata' in error && typeof error.$metadata === 'object' && error.$metadata !== null
      ? error.$metadata
      : null;
  const statusCode =
    metadata && 'httpStatusCode' in metadata && typeof metadata.httpStatusCode === 'number'
      ? metadata.httpStatusCode
      : null;

  return name === 'NotFound' || statusCode === 404;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function headObject(key: string): Promise<StoredObjectMetadata | null> {
  const retryDelaysMs = [0, 150, 300];

  for (const [index, retryDelayMs] of retryDelaysMs.entries()) {
    if (retryDelayMs > 0) {
      await delay(retryDelayMs);
    }

    try {
      const response = await getStorageClient().send(
        new HeadObjectCommand({
          Bucket: getStorageBucketName(),
          Key: key,
        }),
      );

      return {
        contentLength: typeof response.ContentLength === 'number' ? response.ContentLength : null,
        contentType: response.ContentType ?? null,
      };
    } catch (error) {
      if (isObjectNotFound(error)) {
        if (index === retryDelaysMs.length - 1) {
          return null;
        }
        continue;
      }

      throw error;
    }
  }

  return null;
}

export function resetStorageClientForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  storageClient = null;
  storageConfig = null;
}
