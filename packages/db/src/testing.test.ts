import { describe, expect, it } from 'vitest';

import { isTestEnvironment, resolveDatabaseUrl } from './client';
import { dbTestIsolationStrategy, TEST_TABLES } from './testing';

describe('resolveDatabaseUrl', () => {
  it('prefers TEST_DATABASE_URL during tests', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://primary',
        TEST_DATABASE_URL: 'postgres://test-db',
      }),
    ).toBe('postgres://test-db');
  });

  it('falls back to DATABASE_URL outside tests', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://primary',
        TEST_DATABASE_URL: 'postgres://test-db',
      }),
    ).toBe('postgres://primary');
  });

  it('does not fall back to TEST_DATABASE_URL outside tests', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        TEST_DATABASE_URL: 'postgres://test-db',
      }),
    ).toBeNull();
  });

  it('treats Vitest env markers as test mode', () => {
    expect(
      isTestEnvironment({
        NODE_ENV: 'development',
        VITEST: '1',
      }),
    ).toBe(true);
  });
});

describe('db test isolation strategy', () => {
  it('documents transaction-first isolation with truncate fallback', () => {
    expect(dbTestIsolationStrategy).toEqual(
      expect.objectContaining({
        preferred: 'transaction',
        fallback: 'truncate',
      }),
    );
    expect(TEST_TABLES).toEqual(['projects', 'uploads']);
  });
});
