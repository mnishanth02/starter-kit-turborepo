import { afterEach, vi } from 'vitest';
import { TEST_DATABASE_PLACEHOLDER } from './db';
import { createClerkBackendMock, resetClerkMock } from './mocks/clerk';
import { createS3ClientMock, createS3PresignerMock, resetR2Mock } from './mocks/r2';
import {
  createUpstashRateLimitMock,
  createUpstashRedisMock,
  resetUpstashMock,
} from './mocks/upstash';

process.env.NODE_ENV = 'test';
process.env.VITEST = '1';
process.env.TEST_DATABASE_URL ??= TEST_DATABASE_PLACEHOLDER;
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
process.env.CLERK_SECRET_KEY ??= 'sk_test_vitest';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= 'pk_test_vitest';
process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:3000';
process.env.CLOUDFLARE_ACCOUNT_ID ??= 'test-account';
process.env.CLOUDFLARE_ACCESS_KEY_ID ??= 'test-access-key';
process.env.CLOUDFLARE_SECRET_ACCESS_KEY ??= 'test-secret-key';
process.env.R2_BUCKET_NAME ??= 'test-bucket';
process.env.R2_PUBLIC_URL ??= 'https://r2.mock/test-bucket';

vi.mock('@clerk/backend', () => createClerkBackendMock());
vi.mock('@aws-sdk/client-s3', () => createS3ClientMock());
vi.mock('@aws-sdk/s3-request-presigner', () => createS3PresignerMock());
vi.mock('@upstash/ratelimit', () => createUpstashRateLimitMock());
vi.mock('@upstash/redis', () => createUpstashRedisMock());

afterEach(() => {
  resetClerkMock();
  resetR2Mock();
  resetUpstashMock();
  vi.clearAllMocks();
});
