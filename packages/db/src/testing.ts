import { sql } from 'drizzle-orm';
import { db, isTestEnvironment } from './client';
import { loadDbEnv } from './load-env';

loadDbEnv();

export const TEST_TABLES = ['projects', 'uploads'] as const;
export type TestDatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const dbTestIsolationStrategy = {
  preferred: 'transaction',
  fallback: 'truncate',
  rationale:
    'Use transaction rollback for direct db tests. Route/integration tests may span multiple app requests through the shared db singleton, so they should truncate known tables between suites when a shared transaction boundary is not practical.',
} as const;

class TestTransactionRollback<T> extends Error {
  constructor(readonly value: T) {
    super('ROLLBACK_TEST_TRANSACTION');
  }
}

export async function withTestTransaction<T>(
  callback: (tx: TestDatabaseTransaction) => Promise<T>,
): Promise<T> {
  try {
    await db.transaction(async (tx) => {
      const result = await callback(tx);
      throw new TestTransactionRollback(result);
    });
  } catch (error) {
    if (error instanceof TestTransactionRollback) {
      return error.value;
    }

    throw error;
  }

  throw new Error('Test transaction completed without triggering a rollback');
}

export async function truncateTestTables(): Promise<void> {
  if (!isTestEnvironment()) {
    throw new Error('truncateTestTables can only run in a test environment');
  }

  const tableList = TEST_TABLES.map((tableName) => `"${tableName}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`));
}
