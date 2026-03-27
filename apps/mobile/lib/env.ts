import { z } from 'zod';

const clerkEnvSchema = z.object({
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

const apiEnvSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),
});

type ClerkEnv = z.infer<typeof clerkEnvSchema>;
type ApiEnv = z.infer<typeof apiEnvSchema>;

let _clerkEnv: ClerkEnv | undefined;
let _apiEnv: ApiEnv | undefined;

export function getClerkEnv(): ClerkEnv {
  if (!_clerkEnv) {
    _clerkEnv = clerkEnvSchema.parse({
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
  }
  return _clerkEnv;
}

export function getApiEnv(): ApiEnv {
  if (!_apiEnv) {
    _apiEnv = apiEnvSchema.parse({
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    });
  }
  return _apiEnv;
}

export function getEnv(): ClerkEnv & ApiEnv {
  return {
    ...getClerkEnv(),
    ...getApiEnv(),
  };
}
