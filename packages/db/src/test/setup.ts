process.env.NODE_ENV = 'test';
process.env.VITEST = '1';
process.env.TEST_DATABASE_URL ??=
  'postgresql://starter:starter@127.0.0.1:5432/starter_kit_test?sslmode=require';
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
