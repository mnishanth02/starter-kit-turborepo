import { z } from 'zod';

const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

let _serverEnv: ServerEnv | undefined;
let _clientEnv: ClientEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    });
  }
  return _serverEnv;
}

export function getClientEnv(): ClientEnv {
  if (!_clientEnv) {
    _clientEnv = clientSchema.parse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
  }
  return _clientEnv;
}
