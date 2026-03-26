# Starter Kit — Final Implementation Plan

> **Reviewed by:** GPT 5.4, Claude Sonnet 4.6, Claude Opus 4.6 (March 2026)
> **Status:** Ready for execution
> **Auth decision:** Switch from Better Auth to **Clerk** (unanimous recommendation from all 3 reviewers)

---

## Review Summary

All three models reviewed the original spec (`docs/starter-kit-plan.md`) and the draft implementation plan independently. Below is the consensus.

### Auth Decision: Switch to Clerk (Unanimous)

| Reviewer | Verdict | Key Reasoning |
|----------|---------|---------------|
| GPT 5.4 | **Switch to Clerk** | "Starter's value is reliable cross-platform setup; Better Auth puts the highest-risk path on unstable ground." |
| Sonnet 4.6 | **Switch to Clerk** | "Phase 0 spike reduces from multi-day debugging to a 2-hour exercise. Four known open issues against Better Auth Expo is not a minor concern." |
| Opus 4.6 | **Switch to Clerk** | "Clerk eliminates this entire risk category. The Expo SDK is mature, the Hono middleware exists, and the Next.js integration is best-in-class." |

**What Clerk eliminates:**
- iOS `@better-auth/expo/client` import failure (#7218) → **gone**
- Android `node:buffer` build failure (#1551) → **gone**
- Server/client code co-bundling leak (#7603) → **gone**
- Auth persistence/SecureStore uncertainty (#4570) → **gone**
- Complex 4-step Hono middleware ordering (§9.3) → **simplified to single middleware**
- CSRF middleware (§9.5) → **largely unnecessary** (Clerk uses short-lived JWTs)

**What Clerk changes:**
- `packages/auth` becomes a thin wrapper around Clerk SDKs, not a complex multi-entrypoint package
- No auth tables in your Drizzle schema — Clerk manages user data externally
- `projects.user_id` and `uploads.user_id` store Clerk's `userId` string directly as FK
- Auth routes (`/api/auth/*`) are handled by Clerk, not by Hono
- Hono middleware uses `@clerk/backend` `authenticateRequest()` for JWT verification
- `proxy.ts` uses `clerkMiddleware()` from `@clerk/nextjs`
- Env vars: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` (optional)

**Clerk trade-offs to accept:**
- **Cost:** Free tier = 10,000 MAU per project. Paid beyond that (~$0.02/MAU). Acceptable for a starter kit.
- **Vendor lock-in:** User data lives in Clerk's cloud. Mitigated by the `packages/auth` boundary — a cloned project can swap to self-hosted auth later.
- **User data queries:** If you need user emails/names in SQL queries (e.g., "list projects with owner name"), add a lightweight `profiles` sync table populated by Clerk webhooks. For the starter kit's scope, Clerk userId as FK is sufficient.

### Top Issues Fixed in This Plan (from all 3 reviews)

1. **React version pinning missing** → Added as explicit Step 1.1
2. **Hono version pinning missing** → Added as explicit Step 1.1
3. **Middleware order bug** (logging between CORS and auth) → Fixed
4. **Phase 0 exit criteria too vague** → Now requires spike findings doc + implemented workarounds
5. **CI too late (was Phase 6)** → Minimal CI added in Phase 2
6. **Test setup too late (was Phase 6)** → Vitest setup moved to Phase 4
7. **Package boundary test premature** → Moved to Phase 2 when real exports exist
8. **`db:reset` implementation missing** → Added explicit step
9. **Client IP extraction for rate limiting undefined** → Added dedicated step
10. **Mobile network error boundary was a footnote** → Now a dedicated Phase 3 deliverable
11. **Hardening pass deferred too late** → Converted to per-route checklist during Phase 4
12. **Bundle size / cold start risk ignored** → Added measurement to Phase 0
13. **Neon pooler vs direct URL undocumented** → Added to env setup
14. **Expo New Architecture module compat unverified** → Added to Phase 1

---

## Phase 0: Technical Spikes (De-Risk Before Building)

**Goal:** Validate the remaining integration points. With Clerk replacing Better Auth, the auth spike risk drops dramatically — but Hono + Next.js 16 and Clerk + Hono still need proof.

**Time estimate guidance:** This phase should complete quickly with Clerk. If any spike takes more than 1 day, escalate.

### Step 0.1 — Hono inside Next.js 16 spike
- Create a minimal Next.js 16 app (standalone, no monorepo)
- Add catch-all route at `app/api/[[...route]]/route.ts`
- Mount a Hono app using `handle` from `hono/vercel` (verify correct import path for Hono 4.12.x — may be `hono/vercel` or `hono/nextjs`)
- Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE` handlers
- Create `proxy.ts` (Next.js 16 renamed `middleware.ts`) and confirm it can intercept requests
- **Confirm:** Hono receives requests, returns typed JSON, path params work, `proxy.ts` redirects work
- **Bundle size check:** Import a non-trivial set of deps (Drizzle types, Zod, a few route stubs) into the catch-all and measure the Vercel function size. Document the baseline — if it exceeds ~5MB, note route-splitting as a future concern (§25.5).

### Step 0.2 — Clerk + Next.js 16 spike
- Add `@clerk/nextjs` to the spike project
- Configure `clerkMiddleware()` in `proxy.ts`
- Build minimal sign-in/sign-up using Clerk's prebuilt components (or custom flow)
- Confirm: session works, protected page rejects unauthenticated, `proxy.ts` redirects
- **Confirm:** `clerkMiddleware()` works with Next.js 16's `proxy.ts` pattern (not legacy `middleware.ts`)

### Step 0.3 — Clerk + Hono middleware spike
- In the same spike, add `@clerk/backend` to the Hono app
- Create auth middleware:
  ```ts
  import { createClerkClient } from '@clerk/backend'
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  app.use('/api/*', async (c, next) => {
    const result = await clerk.authenticateRequest(c.req.raw)
    if (result.isSignedIn) {
      c.set('userId', result.toAuth().userId)
    }
    await next()
  })
  ```
- Create a protected endpoint that reads `c.get('userId')`
- Confirm: authenticated request returns user data, unauthenticated returns 401
- **Confirm:** Both web (cookie-based) and mobile (JWT bearer) auth headers are verified correctly by `authenticateRequest()`

### Step 0.4 — Clerk + Expo spike (iOS + Android)
- Create a minimal Expo SDK 55 project alongside the spike web app
- Install `@clerk/clerk-expo` with `expo-secure-store` for token caching
- Build sign-in, sign-up screens
- **Test on iOS simulator:** sign-in, session restore on app restart, sign-out
- **Test on Android emulator:** same flows
- Confirm: both platforms can call the protected Hono endpoint from Step 0.3
- Confirm: session persistence works across app restarts on both platforms

### Step 0.5 — Hono RPC type-safety spike
- From the Expo spike app, create an `hc()` client using type-only import of the Hono app type
- Enable `unstable_enablePackageExports = true` in Metro config
- If `hono/client` fails to resolve: add targeted `resolveRequest` override
- Confirm: TypeScript autocomplete works for routes, request/response types flow through
- **Document all Metro config workarounds needed** — these must be carried to Phase 1

### Exit criteria
- [ ] Hono + Next.js 16 catch-all works with correct `hono/vercel` import
- [ ] `proxy.ts` (Next.js 16) confirmed working with `clerkMiddleware()`
- [ ] Clerk auth works on web (sign-in, sign-out, protected routes)
- [ ] Clerk + `@clerk/backend` works as Hono middleware (both cookie and JWT verification)
- [ ] Clerk works on iOS AND Android via `@clerk/clerk-expo`
- [ ] Session persistence works on both mobile platforms
- [ ] Hono RPC types work from Expo
- [ ] Bundle size baseline documented
- [ ] `docs/spike-findings.md` created with: confirmed import paths, Metro config workarounds, version pins, platform-specific notes

---

## Phase 1: Monorepo Foundation

**Goal:** Scaffold the complete repo structure so all subsequent phases add code into the right places.

### Step 1.1 — Root workspace setup
- Initialize git repo
- Create `package.json` with:
  - `pnpm` workspace fields and root script stubs
  - `engines: { "node": ">=20.19.0" }`
  - **`pnpm.overrides`** pinning exact versions (from §25.7):
    ```json
    "pnpm": {
      "overrides": {
        "react": "19.2.0",
        "react-dom": "19.2.0",
        "react-native": "0.83.x"
      }
    }
    ```
  - Pin **Hono to 4.12.9** in root `package.json` dependencies or overrides (§25.8)
- Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`
- Create `.npmrc` with `node-linker=hoisted` (required for Metro/pnpm compat)
- Create `.gitignore` covering: `.env`, `.env.local`, `node_modules/`, `.next/`, `.expo/`, `.turbo/`, `*.tsbuildinfo`, `dist/`, `drizzle/meta/`, `.DS_Store`
- Create `.env.example` with all env vars:
  - `DATABASE_URL` (document pooler vs direct URL format for production vs local)
  - `TEST_DATABASE_URL` (for test isolation — §19.1.1)
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_WEBHOOK_SECRET` (optional, for user sync)
  - `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `EXPO_PUBLIC_API_BASE_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `TURBO_TOKEN`, `TURBO_TEAM` (CI only, optional)
- Pin Node.js via `.node-version` file to `20.19.0`

### Step 1.2 — Turborepo configuration
- Install `turbo` as root dev dependency
- Create `turbo.json` with pipeline for: `build`, `dev`, `lint`, `typecheck`, `test`
- Configure `dependsOn`, `inputs`, `outputs` for each task
- `dev` tasks: persistent, no caching
- Configure remote caching env vars in docs (`TURBO_TOKEN`, `TURBO_TEAM`)

### Step 1.3 — TypeScript base configuration
- Create `tsconfig.base.json` at root:
  - `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`
  - Path aliases for `@starter/*` packages
- Each package/app will extend this base

### Step 1.4 — Biome configuration
- Install Biome 2.4.x as root dev dependency
- Create `biome.json` using v2 syntax:
  - Use `includes` field (not legacy `ignore`/`include`)
  - Do NOT use `all: true` in linter config
  - Use `biome-ignore` for suppression comments
- Run `biome migrate --write` after initial config
- Confirm `pnpm lint` and `pnpm format` work at root level

### Step 1.5 — Scaffold all packages (parallelizable)
These four can be done simultaneously:

**`packages/validation`** (leaf package — no internal deps):
- `package.json` with `@starter/validation`, `exports` map
- `tsconfig.json` extending base
- Placeholder `index.ts`

**`packages/db`** (depends on `@starter/validation`):
- `package.json` with `@starter/db`, dependency on `@starter/validation`
- `exports` map (server-only entrypoint)
- `tsconfig.json`, placeholder `index.ts`
- `drizzle.config.ts` placeholder

**`packages/auth`** (depends on `@starter/db`, `@starter/validation`):
- `package.json` with `@starter/auth`
- `exports` map with entrypoints:
  - `@starter/auth/server` — Clerk backend verification, `requireAuth` middleware, `getAuth` helpers
  - `@starter/auth/client` — Clerk client hooks, session types (web + mobile safe)
- `tsconfig.json`, placeholder files for each entrypoint
- Note: no separate `/mobile` entrypoint needed — `@clerk/clerk-expo` is used directly in `apps/mobile`

**`packages/api`** (depends on `@starter/auth`, `@starter/db`, `@starter/validation`):
- `package.json` with `@starter/api`, server-only `exports` map
- `tsconfig.json`, placeholder `index.ts`

### Step 1.6 — Scaffold `apps/web`
- `npx create-next-app@latest apps/web` with Next.js 16, App Router, TypeScript
- Install Tailwind CSS v4.2
- Run `pnpm dlx shadcn@latest init` (auto-detects Tailwind v4, installs `tw-animate-css` not deprecated `tailwindcss-animate`)
- Install `@clerk/nextjs`
- Create `apps/web/lib/env.ts` — Zod env validation for server + client vars (fail fast)
- Create `apps/web/styles/theme.css` — CSS custom properties for design tokens
- Create `proxy.ts` placeholder with `clerkMiddleware()` wiring
- Wire workspace package deps in `apps/web/package.json`
- Create placeholder route groups: `app/(public)/`, `app/(auth)/`, `app/(protected)/`

### Step 1.7 — Scaffold `apps/mobile`
- `npx create-expo-app apps/mobile` with Expo SDK 55 + Expo Router v7
- Configure `app.config.ts` with app scheme (`exp://**` for dev, production scheme placeholder)
- Configure `metro.config.js` (implement findings from Phase 0 spike):
  - `unstable_enablePackageExports = true`
  - `hono/client` `resolveRequest` override if needed
- Install `@clerk/clerk-expo` and `expo-secure-store`
- Create `apps/mobile/lib/env.ts` — Zod validation for `EXPO_PUBLIC_*` vars
- Create `apps/mobile/src/lib/theme.ts` — TypeScript design tokens matching web theme
- **Verify Expo New Architecture module compatibility:** confirm `expo-secure-store`, `expo-document-picker`, `expo-image-picker` all support New Architecture (SDK 55 enables it by default and cannot disable)
- Wire workspace package deps
- Run `npx expo start --clear` to flush stale Metro cache (§5.2)

### Step 1.8 — Wire root scripts
Add all scripts to root `package.json`:
- `dev`, `dev:web`, `dev:mobile`, `dev:all`
- `build`, `lint`, `format`, `typecheck`
- `test`, `test:web`, `test:mobile`
- `db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:cleanup`, `db:reset`
- `clean` — removes `node_modules`, `.turbo`, `.next`, `.expo`, `*.tsbuildinfo` across workspace

### Step 1.9 — Verify workspace integrity
- Run `pnpm install` from root
- Run `pnpm ls react` — confirm single version 19.2.0 across all packages (§25.7)
- Run `pnpm ls hono` — confirm single version 4.12.9 (§25.8)
- Run `pnpm typecheck` — all packages and apps compile
- Run `pnpm lint` — Biome passes
- Import `@starter/validation` from both `apps/web` and `apps/mobile` — confirm resolves
- Confirm `pnpm dev:web` starts the web app
- Confirm `pnpm dev:mobile` starts the Expo app

### Exit criteria
- [ ] `pnpm install` succeeds cleanly
- [ ] `pnpm ls react` shows 19.2.0 everywhere
- [ ] `pnpm ls hono` shows 4.12.9 everywhere
- [ ] `pnpm dev:web` boots Next.js with Clerk sign-in page
- [ ] `pnpm dev:mobile` boots Expo app in simulator
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Expo New Architecture module compatibility confirmed

---

## Phase 2: Backend Core + Minimal CI

**Goal:** Get Hono operational with typed routes, error handling, health checks — and get CI running early.

### Step 2.1 — Hono app composition
- Create `packages/api/src/app.ts` — main Hono app instance
- Register middleware in this order (corrected from review feedback):
  1. **Request logging middleware** (first — captures all requests including auth)
  2. **CORS middleware** (using `CORS_ALLOWED_ORIGINS` env var)
  3. **Clerk auth middleware** (`authenticateRequest` from `@clerk/backend` — sets `c.var.userId` if authenticated)
  4. Route groups
- Export the app and its type (`AppType`) for RPC client derivation
- Note: Auth routes are NOT in Hono — Clerk handles them externally. Hono only has: `health`, `projects`, `uploads`, `public`.

### Step 2.2 — Error contract and response helpers
- In `packages/validation`:
  - Define shared `ApiError` type: `{ code: string; message: string; errors?: FieldError[] }`
  - Define error code enum: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`
  - Define `FieldError` type for form validation feedback: `{ field: string; message: string }`
- In `packages/api`:
  - Create `apiError(c, status, code, message, errors?)` helper
  - Create global error handler: catches unhandled errors, returns safe `INTERNAL_ERROR` (no stack leak in production)
  - Create `validationError(c, zodError)` helper that maps Zod issues to `FieldError[]`

### Step 2.3 — Request logging middleware
- Assign `crypto.randomUUID()` request ID per request, store in Hono context
- Create logger wrapper (`packages/api/src/lib/logger.ts`): prepends request ID + timestamp
- Log: method, path, status, duration on completion
- Stack traces in development, safe summaries in production

### Step 2.4 — Authorization helpers
- `requireAuth` middleware: checks `c.var.userId`, rejects with `401 UNAUTHORIZED` if absent
- `requireResourceOwner(resourceUserId)`: compares `c.var.userId` against resource owner, returns `403 FORBIDDEN` on mismatch

### Step 2.5 — Health route
- Create `packages/api/src/routes/health.ts`
- `GET /api/health` returns `{ status: "ok", db: true/false, timestamp }` (DB check wired in Phase 3; returns `db: false` for now)

### Step 2.6 — Mount Hono in Next.js
- Create `apps/web/app/api/[[...route]]/route.ts`
- Import Hono app from `@starter/api`, bridge with `handle` from `hono/vercel`
- Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Confirm: `curl localhost:3000/api/health` returns health response

### Step 2.7 — Validation schemas (non-auth only)
- In `packages/validation`, add Zod schemas for:
  - `createProjectInput`, `updateProjectInput`
  - `uploadSessionRequest`, `uploadConfirmInput`
  - Query-key factory constants for TanStack Query cache keys
- **Defer auth schemas** — Clerk handles auth input validation internally

### Step 2.8 — API client setup in both apps
- In `apps/web/lib/api-client.ts`: create typed `hc()` client with type-only import of `AppType` (relative URL `/api/...` — no base URL needed for web)
- In `apps/mobile/src/lib/api-client.ts`: create typed `hc()` client using `EXPO_PUBLIC_API_BASE_URL`. **Must include Clerk token in requests** — use `@clerk/clerk-expo`'s `useAuth().getToken()` to get the session JWT and attach as `Authorization: Bearer <token>` header.
- Confirm: TypeScript autocomplete works for routes in both apps

### Step 2.9 — TanStack Query setup
- In `apps/web`: install TanStack Query v5, create `QueryClient`, wrap in `QueryClientProvider` in root layout. Configure `gcTime` (not `cacheTime`).
- In `apps/mobile`: same setup in Expo root layout

### Step 2.10 — Package boundary enforcement (real test)
Now that packages have real server-only imports:
- Create a test TS file in `apps/mobile` that attempts `import from '@starter/db'` — confirm it **fails** to compile
- Create a test TS file in `apps/mobile` that attempts `import from '@starter/api'` — confirm it **fails** to compile
- Delete test files after confirmation
- Verify with `pnpm ls hono` that only one version exists across workspace

### Step 2.11 — Minimal CI pipeline
Set up early CI (GPT 5.4 review: "CI from the beginning"):
- Create `.github/workflows/ci.yml`:
  1. Checkout + pnpm install (with cache)
  2. `pnpm lint` (Biome)
  3. `pnpm typecheck` (all packages + apps including mobile)
  4. `pnpm build` (build validation)
- Pin Node.js to `20.x`
- CI failures block merge
- Tests, Playwright, and `drizzle-kit check` added in later phases

### Exit criteria
- [ ] Health endpoint responds at `localhost:3000/api/health`
- [ ] `AppType` export produces valid RPC types when imported by both apps
- [ ] Error contract (`{ code, message, errors? }`) defined and used
- [ ] Request logging shows request ID in terminal output
- [ ] `@starter/db` and `@starter/api` fail to import from `apps/mobile`
- [ ] CI pipeline runs: lint → typecheck → build (green)
- [ ] `pnpm ls hono` shows single version

---

## Phase 3: Database and Auth

**Goal:** Wire up real database, Clerk auth integration, and session management on both platforms.

### Step 3.1 — Neon database connection
- In `packages/db`: install `pg` and `drizzle-orm`
- Create `packages/db/src/client.ts`:
  - `pg.Pool` at module scope using `DATABASE_URL`
  - Document: use `-pooler` suffix URL for production (Neon pooler endpoint), direct URL for local dev
  - Add explicit Node-only comment: "This package cannot be imported in edge runtime or client bundles"
- Create Drizzle client wrapping the pool
- Export for use by `packages/api` and `packages/auth`

### Step 3.2 — Drizzle schema definition
- **No auth tables** — Clerk manages user data externally. No `betterAuthSchema` reference needed.
- Create `packages/db/src/schema/projects.ts`:
  - `projects` table: `id` (uuid), `user_id` (text — Clerk user ID), `name`, `description`, `status`, `created_at`, `updated_at`
- Create `packages/db/src/schema/uploads.ts`:
  - `uploads` table: `id` (uuid), `user_id` (text — Clerk user ID), `object_key`, `filename`, `content_type`, `size_bytes`, `status`, `created_at`, `updated_at`
- Create barrel export `packages/db/src/schema/index.ts`

### Step 3.3 — Migrations setup
- Configure `packages/db/drizzle.config.ts` with schema path and output directory
- Run `pnpm db:generate` → generates initial migration
- Run `pnpm db:migrate` → applies to Neon dev branch
- Confirm tables exist
- Add `drizzle-kit check --config packages/db/drizzle.config.ts` to CI pipeline

### Step 3.4 — Clerk server-side auth wiring
- In `packages/auth/src/server.ts`:
  - Initialize `createClerkClient({ secretKey })` for server-side user verification
  - Export `getAuth(request)` helper that calls `authenticateRequest`
  - Export `requireAuth` Hono middleware (moves from api to auth package for reuse)
  - Export `requireResourceOwner(resourceUserId)` helper
- In `packages/auth/src/client.ts`:
  - Re-export Clerk's useful client types and hooks
  - Export session-related type definitions

### Step 3.5 — Web auth integration
- In `apps/web`:
  - Wrap root layout with `<ClerkProvider>`
  - Configure `proxy.ts` with `clerkMiddleware()` — protect `/(protected)/*` routes
  - Build sign-up page using Clerk components (or custom flow)
  - Build sign-in page
  - Build sign-out button component
  - Confirm: unauthenticated users redirected from protected routes
  - Note: all pages accessing `params` or `searchParams` must `await` them (Next.js 16 async params)

### Step 3.6 — Mobile auth integration
- In `apps/mobile`:
  - Wrap root layout with `<ClerkProvider>` from `@clerk/clerk-expo`
  - Configure `expo-secure-store` token cache
  - Build sign-in and sign-up screens using Clerk's custom flow hooks
  - Implement auth-gated navigation: root layout checks `isSignedIn` before rendering protected routes, splash screen during session check
  - Add `AppState` listener for session re-validation on foreground resume
  - **Test on iOS simulator:** full auth flow + session restore on restart
  - **Test on Android emulator:** same flow

### Step 3.7 — Mobile network error boundary (dedicated deliverable)
Create a reusable component BEFORE building feature screens (Sonnet review: "critical for developer experience"):
- Detect when API is unreachable (wrong URL, no network, server down)
- Show "Cannot reach server" state with retry button
- Wrap all TanStack Query providers with this boundary
- A misconfigured `EXPO_PUBLIC_API_BASE_URL` must produce an obvious error, not cryptic failures

### Step 3.8 — Wire health route to DB
- Update health endpoint: `SELECT 1` against database
- Return `200` with `{ status: "ok", db: true }` when healthy
- Return `503` with `{ status: "degraded", db: false }` when unreachable

### Step 3.9 — Seed script
- Create `packages/db/src/seed.ts`:
  - Use Clerk Backend API (`clerk.users.createUser()`) to create 2 test users
  - **Insert projects/uploads directly via Drizzle client** (not via API routes — routes don't exist yet in this phase)
  - 5 sample projects per user, 3 sample upload records (metadata only)
- Document seed credentials in README
- Wire to root `pnpm db:seed` script

### Step 3.10 — Implement `db:reset` script
- Create `packages/db/src/reset.ts`:
  - Drop and recreate public schema
  - Run all migrations
  - Run seed
- Wire to root `pnpm db:reset` script
- **Development only** — add safety check that `DATABASE_URL` is not a production URL

### Exit criteria
- [ ] Web: sign-up → sign-in → access protected page → sign-out works
- [ ] Mobile (iOS): same flow with session persistence across app restart
- [ ] Mobile (Android): same flow
- [ ] Protected Hono endpoint rejects unauthenticated requests (401)
- [ ] `requireResourceOwner` prevents cross-user access (403)
- [ ] Health endpoint reports DB status accurately
- [ ] `pnpm db:seed` populates test data
- [ ] `pnpm db:reset` drops, recreates, migrates, and seeds
- [ ] Mobile network error boundary shows clear error when API is unreachable
- [ ] `drizzle-kit check` passes in CI
- [ ] Logout works on both platforms; session expiry redirects to login

---

## Phase 4: Example Features + Test Infrastructure

**Goal:** Build CRUD and Upload reference implementations. Set up test infrastructure alongside features (not after).

### Step 4.0 — Vitest setup (before building features)
- Install Vitest in root workspace
- Configure shared test setup with mocks:
  - In-memory mock for R2 (mock the S3 client)
  - Pass-through mock for Upstash rate limiting (always allow)
  - Mock Clerk auth context for route handler tests (mock `authenticateRequest`)
- Configure `TEST_DATABASE_URL` support
- Define test isolation strategy: each test suite that touches DB runs in a transaction rolled back after completion (or truncates tables between suites)

### Step 4.1 — Projects API routes + tests
- Create `packages/api/src/routes/projects.ts`:
  - `GET /api/projects` — list user's projects
  - `POST /api/projects` — create (validates with Zod schema from `@starter/validation`)
  - `GET /api/projects/:id` — get single (enforces ownership)
  - `PUT /api/projects/:id` — update (enforces ownership via `requireResourceOwner`)
  - `DELETE /api/projects/:id` — delete (enforces ownership)
- All routes use `requireAuth` middleware
- All errors follow the `{ code, message, errors? }` contract — **enforce during development, not as a later hardening pass**
- **Write Vitest tests alongside:** happy path + auth failures + validation errors + ownership violations

### Step 4.2 — Projects web screens (can parallel with 4.3)
- **List page** (`apps/web/app/(protected)/projects/page.tsx`):
  - Server Component: `prefetchQuery()` → `dehydrate()` → `<HydrationBoundary>`
  - Client Component: `useQuery()` — data visible immediately, no loading flash
  - **This is the reference SSR → TanStack Query handoff implementation (§4.3)**
  - Verify: view page source, confirm project data is in HTML (server-rendered)
- **Create page:** React Hook Form + Zod resolver + shadcn form wrappers
  - Demonstrate: client-side validation, server error mapping back to fields
- **Edit page** (`/projects/[id]/edit`): `const { id } = await props.params` (Next.js 16)
- **Detail page** (`/projects/[id]`): server-rendered with edit/delete actions
- **Infrastructure patterns** (explicit deliverables per §15.3):
  - Page-level error boundary
  - `loading.tsx` Suspense boundaries / skeleton screens
  - Toast notifications via sonner for mutation feedback

### Step 4.3 — Projects mobile screens (can parallel with 4.2)
- **List screen:** TanStack Query `useQuery()` for project list
- **Create/edit screen:** native form using same Zod schemas
- **Delete:** confirmation dialog → mutation → cache invalidation
- Render validation errors from backend `errors[]` response
- Uses network error boundary from Step 3.7

### Step 4.4 — Upload API routes + R2 integration + tests
- Create `packages/api/src/lib/storage.ts`:
  - Initialize S3-compatible client for Cloudflare R2
  - `createSignedUploadUrl(key, contentType, maxSize)` — presigned PUT, 5min expiry, MIME restriction
  - `deleteObject(key)` — deletes from R2
  - `headObject(key)` — checks existence + size (note: brief propagation delay possible with R2 — add small retry)
- Create `packages/api/src/routes/uploads.ts`:
  - `POST /api/uploads/session` — create pending metadata, return signed URL
  - `POST /api/uploads/:id/confirm` — HEAD to R2, verify size ≤ 50MB, mark complete. **Reject and delete oversized objects.**
  - `GET /api/uploads` — list user's uploads (filter out stale pending > 1hr)
  - `DELETE /api/uploads/:id` — delete metadata + optionally delete R2 object
- **Write Vitest tests** for upload flow with mocked R2 client

### Step 4.5 — Upload web screens (can parallel with 4.6)
- Upload form: file picker → request signed URL → direct PUT to R2 → confirm
- Upload list: display user's files with metadata
- Delete with confirmation

### Step 4.6 — Upload mobile screens (can parallel with 4.5)
- File picker using `expo-document-picker` or `expo-image-picker`
- Same flow: request signed URL → PUT to R2 → confirm
- Upload list and delete

### Step 4.7 — Public route
- Create `packages/api/src/routes/public.ts`:
  - `GET /api/public/ping` — no auth required, returns `{ message: "pong", timestamp }`
  - This endpoint will be rate-limited in Phase 5

### Step 4.8 — Validation schema tests
- Write Vitest tests for all Zod schemas: valid input, invalid input, edge cases, field-level error messages

### Step 4.9 — Web UI surfaces
- Public landing/welcome screen
- Protected dashboard shell (layout with nav, sidebar)
- Rate-limit demo page placeholder (wired in Phase 5)

### Exit criteria
- [ ] Projects CRUD works end-to-end on web and mobile
- [ ] Upload flow works end-to-end on web and mobile
- [ ] SSR → TanStack Query handoff confirmed (no loading flash, data in page source)
- [ ] Validation errors display correctly on forms (web + mobile)
- [ ] Error boundaries, loading states, and toasts are demonstrated
- [ ] Vitest tests pass for: validation schemas, project routes, upload routes
- [ ] All error responses follow `{ code, message }` contract
- [ ] Expired signed URLs fail correctly
- [ ] Oversized uploads are rejected at confirm time

---

## Phase 5: Rate Limiting, Hardening, and Deployment Docs

**Goal:** Add production safety layers and make deployment reproducible.

### Step 5.1 — Upstash rate-limit setup
- Install `@upstash/ratelimit` and `@upstash/redis` in `packages/api`
- Create `packages/api/src/lib/rate-limit.ts`:
  - Initialize Redis client from env vars
  - Define policies (all **Fixed Window** per §14.1):
    - `publicEndpoint`: 20 req / 1 min per IP
    - `uploadSession`: 10 req / 1 min per user
  - Create Hono middleware factory: `rateLimit(policy, keyExtractor)`
  - Document Fixed Window vs Sliding Window tradeoff (§14.1) — teams can switch for single-region deployments

### Step 5.2 — Client IP extraction (dedicated step per Sonnet review)
- Create `packages/api/src/lib/ip.ts`:
  - Read `X-Forwarded-For` header (Vercel puts real IP here)
  - Extract leftmost untrusted IP correctly
  - Document: naïve extraction is a rate-limit bypass vector
  - Fallback to socket address for local dev
- Use this utility in all IP-keyed rate-limit middleware

### Step 5.3 — Apply rate-limit middleware
- Apply IP-based policies to public routes (before auth middleware)
- Apply user-based policies to upload-session endpoint (after auth middleware)
- `429` responses include `Retry-After` header and use `RATE_LIMITED` error code
- Write Vitest tests for rate-limit middleware behavior

### Step 5.4 — Rate-limit demo surface (web)
- Wire the rate-limit demo page (placeholder from 4.9)
- Button that hits the rate-limited public endpoint repeatedly
- Show `429` response and `Retry-After` guidance in UI

### Step 5.5 — `db:cleanup` script
- Create `packages/db/src/cleanup.ts`: delete stale `pending` upload records older than 1 hour
- Wire to root `pnpm db:cleanup`

### Step 5.6 — Final error audit
- Review all routes: confirm every error uses `{ code, message }` contract
- Confirm: no stack traces leaked in production mode
- Confirm: all Zod validation errors return `VALIDATION_ERROR` with `errors[]`
- Confirm: all auth failures return `UNAUTHORIZED` or `FORBIDDEN`
- Confirm: request logging captures all routes with request IDs

### Step 5.7 — Deployment documentation
- Create `docs/deployment.md` covering:
  - **Vercel setup:** Node.js 20.x runtime, Fluid Compute for connection pool persistence, env var configuration
  - **Neon setup:** pooled connection string (`-pooler` suffix required for production), direct connection for local dev, branch creation for preview/staging
  - **Clerk setup:** API keys, webhook endpoint configuration (optional), production domain setup
  - **R2 setup:** bucket creation, CORS rules (allow PUT from web origin with Content-Type header), lifecycle rules for `tmp/` prefix auto-expiry
  - **Upstash setup:** Redis instance creation, env vars
  - **Preview environments:** Vercel preview deployments + Neon database branches + preview-specific env vars
  - **Mobile staging:** switching `EXPO_PUBLIC_API_BASE_URL` via `app.config.ts` or EAS build profiles
  - **Migration timing:** run `db:migrate` before deploying new code

### Exit criteria
- [ ] Rate-limited endpoints return `429` with `Retry-After` when limits exceeded
- [ ] IP extraction works correctly on Vercel (test with `X-Forwarded-For`)
- [ ] All error responses audited and consistent
- [ ] Deployment guide complete enough to deploy from scratch
- [ ] `db:cleanup` removes stale pending uploads

---

## Phase 6: Testing, CI Completion, and Release Readiness

**Goal:** Complete test coverage, finalize CI pipeline, write README. Make it clone-ready.

### Step 6.1 — Playwright E2E (web)
- Install Playwright in `apps/web`
- Create smoke test: sign-up → sign-in → create project → edit project → upload file → verify protected state
- Configure to run against test database
- Wire to `pnpm test:web`

### Step 6.2 — Mobile tests
- Install Jest + React Native Testing Library in `apps/mobile`
- Component/screen tests for:
  - Auth flow (sign in, sign out, session restore)
  - Project CRUD happy path
  - Navigation guard (unauthenticated redirect)
- Wire to `pnpm test:mobile`
- **Maestro E2E:** Add config file but mark as "run manually before releases" — requires macOS runner, too expensive for every CI run

### Step 6.3 — Finalize CI pipeline
- Update `.github/workflows/ci.yml`:
  1. Checkout + pnpm install (with cache)
  2. `pnpm lint` (Biome)
  3. `pnpm typecheck` (all packages + apps including mobile)
  4. `drizzle-kit check --config packages/db/drizzle.config.ts`
  5. `pnpm test` (Vitest unit/integration) against CI test database
  6. `pnpm build`
  7. Playwright smoke tests
- Configure Turborepo remote caching (`TURBO_TOKEN`, `TURBO_TEAM`)
- Decide: Linux-only CI (fast, cheap) vs separate macOS job for mobile type checking
- CI failures block merge

### Step 6.4 — Final README
Write comprehensive `README.md`:
- Tech stack overview
- Prerequisites (Node 20.19+, pnpm 10.x)
- Clone and setup instructions (step by step)
- Environment variable documentation (reference `.env.example`)
- Local development workflow
- Physical device networking setup for mobile (`EXPO_PUBLIC_API_BASE_URL` with LAN IP)
- Database workflow: schema change → `db:generate` → `db:migrate`
- Seed data: `pnpm db:seed` + test credentials
- **"Adding a New Feature" checklist** (§18.4):
  1. Schema → 2. Migration → 3. Validation → 4. API routes → 5. Web pages → 6. Mobile screens → 7. Tests
- **"Removing Example Code" guide:** how to delete `projects` and `uploads` features cleanly
- Deployment reference → `docs/deployment.md`

### Step 6.5 — Fresh clone validation
- Clone to a new directory
- Follow README from scratch: `pnpm install` → configure env → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`
- Verify everything works
- Have a second person follow the README cold
- Confirm: no Alloy-specific naming exists
- Confirm: example feature code is deletable without breaking infrastructure

### Exit criteria
- [ ] All Vitest tests pass
- [ ] Playwright smoke path passes
- [ ] CI pipeline is green end-to-end
- [ ] README is followable by someone who wasn't involved in building it
- [ ] Example code is cleanly removable
- [ ] `drizzle-kit check` passes in CI
- [ ] Fresh clone works from documentation alone

---

## Dependency Graph

```
Phase 0 (Spikes)
  └──→ Phase 1 (Foundation)
         └──→ Phase 2 (Backend Core + Minimal CI)
                └──→ Phase 3 (DB + Auth)
                       └──→ Phase 4 (Features + Test Infra)
                       │      ├── 4.1-4.3 Projects ─┐ (parallel tracks)
                       │      └── 4.4-4.7 Uploads ──┘
                       └──→ Phase 5 (Rate Limit + Hardening)
                              └──→ Phase 6 (Testing + CI + Docs)
```

**Parallelization opportunities within phases:**
- Phase 1: Steps 1.5 (all 4 packages) can be scaffolded simultaneously
- Phase 4: Projects (4.1-4.3) and Uploads (4.4-4.7) are independent feature tracks
- Phase 4: Web screens (4.2, 4.5) and mobile screens (4.3, 4.6) can be parallel
- Phase 6: Playwright (6.1), mobile tests (6.2), and README (6.4) are independent

---

## Architecture Changes Summary (Better Auth → Clerk)

| Aspect | Better Auth (original) | Clerk (final) |
|--------|----------------------|---------------|
| Auth tables in DB | Yes (Better Auth schema) | No (Clerk cloud) |
| User FK in app tables | References local `users.id` | Stores Clerk `userId` string |
| Auth routes in Hono | `/api/auth/*` handled by Hono | Handled externally by Clerk |
| Web middleware | Manual session reading in `proxy.ts` | `clerkMiddleware()` from `@clerk/nextjs` |
| Hono auth middleware | 4-step ordering (CORS → auth → session → routes) | Single `authenticateRequest()` call |
| Mobile auth | `@better-auth/expo` + `expoClient` + workaround shims | `@clerk/clerk-expo` (production-grade) |
| CSRF protection | Required (cookie-based sessions) | Largely unnecessary (short-lived JWTs) |
| `packages/auth` complexity | 3 entrypoints (server/client/mobile) | 2 entrypoints (server/client) |
| Seed users | `auth.api.signUpEmail()` | `clerk.users.createUser()` |
| Phase 0 auth risk | HIGH (4 known issues) | LOW (battle-tested SDKs) |
| Ongoing cost | Free (OSS) | Free < 10K MAU, paid beyond |

---

## Open Risks Still Present

1. **Vercel cold starts** (§25.5) — Single catch-all imports everything. Measured in Phase 0 Step 0.1. If >5MB, document route-splitting as future optimization.
2. **Hono RPC type regression in workspaces** (§25.8) — Tested in spike (standalone) but must be re-verified after Phase 1 in the real monorepo. Added to Phase 2 Step 2.10.
3. **R2 propagation delay at confirm time** — HEAD request may return stale data for recently uploaded objects. Added note to Step 4.4 for retry logic.
4. **Clerk vendor lock-in** — Mitigated by `packages/auth` boundary. Document migration path in README.
5. **pnpm + Metro resolution** — `node-linker=hoisted` is mandatory. Metro config workarounds documented in spike findings.
6. **Vitest + Jest dual framework** — Different runners for packages vs mobile. Turborepo `test` task configured per-package. Accepted complexity.
