export const TEST_DATABASE_PLACEHOLDER =
  'postgresql://starter:starter@127.0.0.1:5432/starter_kit_test?sslmode=require';

export function hasConfiguredTestDatabase(env: NodeJS.ProcessEnv = process.env): boolean {
  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  return Boolean(testDatabaseUrl && testDatabaseUrl !== TEST_DATABASE_PLACEHOLDER);
}
