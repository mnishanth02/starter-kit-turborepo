import { z } from 'zod';

const clerkPublishableKeySchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith('pk_test_') || value.startsWith('pk_live_'),
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key from the Clerk dashboard API keys page (pk_test_... or pk_live_...).',
  );

const clerkEnvSchema = z.object({
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKeySchema,
});

const apiEnvSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().trim().url(),
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
