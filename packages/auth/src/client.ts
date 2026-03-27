/**
 * @starter/auth/client — Client-safe type re-exports
 *
 * Only types and constants — NO server imports.
 * Safe to import in both web (Next.js) and mobile (Expo) bundles.
 *
 * NOTE: Do NOT re-export Clerk hooks here. Web uses @clerk/nextjs,
 * mobile uses @clerk/clerk-expo — they are different packages.
 */

/** Minimal authenticated user shape shared across web and mobile. */
export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

/** Session payload returned by auth middleware. */
export interface AuthSession {
  userId: string;
  sessionId: string;
}
