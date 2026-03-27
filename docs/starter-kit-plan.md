# Starter Kit Build Plan

March 2026

## 1. Purpose

This document defines the complete build plan for a reusable production-ready starter kit that can be cloned into future apps before product-specific work begins.

The starter is not an Alloy feature plan. It is a separate foundation that Alloy can later clone and extend.

The goal of the starter is to remove repeated setup work while keeping the architecture disciplined:

- one pnpm workspace monorepo with Turborepo
- one Next.js web app as the main deployment boundary
- one integrated Hono backend mounted inside that web app
- one Expo mobile app consuming the same typed backend via Hono RPC
- one TanStack Query pattern for client-side server state across web and mobile
- shared packages for auth, database, and validation
- production-ready defaults for code quality, testing, CI, migrations, and deployment

The starter should be reusable across many app types. It must not hard-code Alloy-specific domain behavior.

## 2. Final Decisions

The starter will use the following stack and scope.

### 2.1 Locked Stack

- monorepo: pnpm 10.x workspace + Turborepo 2.x
- web app: Next.js 16 App Router
- backend: Hono 4.12.x mounted inside Next.js route handlers
- client server-state: TanStack Query v5
- auth: Better Auth 1.5.x
- database: Neon Postgres (`@neondatabase/serverless` 1.0.x)
- ORM: Drizzle ORM 0.45.x + drizzle-kit 0.30.x
- validation: Zod
- web forms: React Hook Form 7.x
- object storage: Cloudflare R2
- web UI primitives: shadcn/ui (CLI v4) + Tailwind CSS v4.2
- rate limiting: Upstash Ratelimit 2.x
- code quality: Biome 2.x
- web hosting: Vercel
- mobile app: Expo SDK 55 + Expo Router v7
- runtime: Node.js 20.19+ LTS (required by both Next.js 16 and Expo SDK 55)

### 2.2 Locked Scope Decisions

- keep Turborepo in the starter
- do not include Trigger.dev or any async-job runtime in the starter
- make the starter production-ready, not just a proof of concept
- include Expo as a first-class mobile app from the start
- keep a single integrated backend boundary inside the web app rather than creating a separately deployed API service
- keep the starter single-tenant first

### 2.3 Explicitly Out of Scope

- multi-tenant organizations, roles, and billing
- background jobs and schedulers
- AI workflows and provider orchestration
- analytics and event pipelines
- offline sync
- push notifications
- social login, passkeys, and two-factor auth
- product-specific dashboards and workflows

## 3. Starter Goal

The starter is successful if it gives a new app all of the following on day one:

- web and mobile clients already wired to the same typed backend
- working authentication on both platforms
- one full CRUD example that demonstrates the expected build pattern
- one file-upload example that demonstrates the storage pattern
- one rate-limited endpoint that demonstrates the middleware pattern
- one clean monorepo structure with strong package boundaries
- repeatable local setup, migrations, CI, and deployment flow

The starter is not successful if it is technically complete but hard to remove example code from, or if it forces a future app to undo framework decisions before real work can begin.

## 4. Architectural Principles

### 4.1 One Backend Boundary

The system should expose one backend boundary through Hono mounted inside the Next.js app. The starter must not create a separate `apps/api` deployment.

This keeps deployment and runtime concerns simpler, preserves one contract surface for web and mobile, and matches the integrated boundary already preferred in Alloy's documentation.

### 4.2 Shared Types, Not Shared UI Components

Web and mobile should share:

- typed API access via Hono RPC
- validation schemas
- auth semantics
- query-key conventions
- shared design language — web and mobile define themes in their native format (`apps/web` in CSS custom properties, `apps/mobile` in a TypeScript theme file) following the same color and spacing conventions
- feature boundaries

Web and mobile should not pretend to share the same component primitives.

shadcn/ui and Tailwind v4 are web-only choices. Expo should use React Native primitives with a small native UI layer that follows the same product language without coupling to DOM components.

### 4.3 Server Render First, Query After Hydration

The web app should prefer Next.js server rendering for first page loads, protected shells, and other entry reads.

TanStack Query is the default client-side server-state layer after hydration:

- on web, it handles mutations, cache invalidation, and reactive refresh for live screens
- on mobile, it is the primary server-state layer because Expo does not have a server-rendered first load
- both clients should call the same typed backend via Hono RPC rather than inventing separate fetch patterns

TanStack Query should not replace server rendering on the web. It should take over only when the UI remains interactive after the first render.

**TanStack Query v5 SSR handoff pattern (Next.js App Router):**

The correct wiring for server render + client state in Next.js App Router is:

1. In the Server Component: call `prefetchQuery()` to pre-populate the cache on the server
2. Call `dehydrate()` to produce a serializable snapshot of that cache
3. Pass the snapshot into `<HydrationBoundary state={dehydratedState}>` wrapping the client component tree
4. The client component calls `useQuery()` — it receives data immediately from the dehydrated cache with no loading flash

This pattern must be demonstrated in the CRUD list screen (the primary server-render + client-interactivity example). Use `gcTime` (not `cacheTime` — renamed in v5) for all cache lifetime configuration.

### 4.4 Production-Ready Means Operationally Credible

The starter must include:

- strict typing
- validated environment loading
- predictable database migration flow
- CI checks
- health endpoints
- deployment documentation
- build and test scripts that match real usage

Production-ready does not mean adding every possible concern. It means the included surface is robust enough to deploy and extend without re-architecting the foundation.

### 4.5 Reusable, Not Product-Shaped

The starter should include generic example features only. It should demonstrate patterns, not business logic.

The example domain must be isolated so a cloned app can delete it cleanly.

## 5. Target Monorepo Shape

```text
.
|- apps/
|  |- web/
|  |- mobile/
|- packages/
|  |- api/
|  |- auth/
|  |- db/
|  |- validation/
|- docs/
|- package.json
|- pnpm-workspace.yaml
|- turbo.json
|- tsconfig.base.json
|- biome.json
|- .npmrc
|- .env.example
|- .gitignore
|- .github/workflows/ci.yml
```

The `.gitignore` must cover: `.env`, `.env.local`, `node_modules/`, `.next/`, `.expo/`, `.turbo/`, `*.tsbuildinfo`, `dist/`, `drizzle/meta/`, and platform-specific build artifacts.

### 5.1 Package Dependency Rules

Allowed internal dependency graph:

```text
packages/validation → (no internal deps — leaf package)
packages/db         → packages/validation
packages/auth       → packages/db, packages/validation
packages/api        → packages/auth, packages/db, packages/validation
apps/web            → packages/api, packages/auth, packages/validation
apps/mobile         → packages/auth, packages/validation
```

Rules:

- no circular dependencies allowed
- `packages/api` is server-only — must not be imported by `apps/mobile`
- `packages/db` is server-only — must not be imported by client packages or `apps/mobile`
- environment validation is handled per-app in `apps/web/lib/env.ts` and `apps/mobile/lib/env.ts` — not shared
- enforcement: use TypeScript `package.json` `exports` field to expose only allowed entrypoints per package

### 5.2 Monorepo Tooling Configuration

- pnpm workspace with `pnpm-workspace.yaml` listing `apps/*` and `packages/*`
- Turborepo `turbo.json` must define the task pipeline with explicit `dependsOn`, `inputs`, and `outputs` for each task (`build`, `lint`, `typecheck`, `test`, `dev`)
- Metro bundler auto-configures for monorepos since Expo SDK 52. Manual `watchFolders` / `nodeModulesPaths` setup is no longer required in most cases. Run `npx expo start --clear` after initial setup to flush any stale Metro cache.
- pnpm's default isolated hoisting strategy (symlinks into `.pnpm`) causes Metro resolution failures. The repo root must include an `.npmrc` file with `node-linker=hoisted` to force flat installation. Without this, Expo will fail to resolve workspace packages on first run.
- Hono's `hono/client` subpath export may not resolve in Metro without explicit configuration. In `apps/mobile/metro.config.js`, enable package exports support:

```js
config.resolver.unstable_enablePackageExports = true;
```

If `hono/client` still fails to resolve after enabling package exports, add a targeted `resolveRequest` override:

```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'hono/client') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('hono/dist/client/index.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```
- TypeScript uses `tsconfig.base.json` with shared compiler options and path aliases. Each package and app extends the base config. The base config must set `moduleResolution: "bundler"` to ensure TypeScript respects `package.json` `exports` maps (required for package boundary enforcement in §5.1). Project references (`composite: true`) can be added later if incremental build performance becomes a concern — they are not required for the initial starter.

## 6. App Responsibilities

### 6.1 `apps/web`

Responsibilities:

- host the Next.js App Router application
- mount the Hono backend inside a route handler
- render the web UI using shadcn/ui and Tailwind v4
- use server-rendered reads for first page loads and protected route entry
- use TanStack Query in client components for mutations, invalidation, and reactive refresh after hydration
- handle cookie-based web session flows
- provide web implementations of auth, CRUD, upload, and rate-limit demos
- serve health and readiness routes relevant to the deployed application

Expected key areas:

- `app/`
- `app/(public)/`
- `app/(auth)/`
- `app/(protected)/`
- `app/api/[[...route]]/route.ts`
- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`; export function `proxy()` instead of `middleware()`)
- `lib/`
- `features/`

**Next.js 16 async params:** All pages and layouts that access `params` or `searchParams` must now `await` them — they are Promises in Next.js 16. Pattern: `const { id } = await props.params`. Every CRUD detail/edit page must follow this.

### 6.2 `apps/mobile`

Responsibilities:

- host the Expo application
- consume the same typed backend via Hono RPC
- use TanStack Query as the default server-state layer against the typed backend
- implement mobile auth using `expoClient` with secure session storage
- provide native screens for auth, CRUD, and uploads
- demonstrate platform-specific file selection while preserving the same backend upload flow

Expected key areas:

- `app/` with Expo Router
- `src/features/`
- `src/lib/`
- `src/components/`
- `app.config.ts`

## 7. Package Responsibilities

### 7.1 `packages/api`

Responsibilities:

- compose the Hono application
- register route groups
- apply auth middleware
- define Upstash rate-limit clients, reusable policies, and Hono middleware for policy application
- wrap Cloudflare R2 access, issue signed uploads, define upload confirmation flow, and persist upload metadata
- convert domain outputs into transport-safe responses
- expose server-side route builders used by the Next.js route handler

This package is server-only.

### 7.2 API Client and Query Hooks

The Hono RPC client (`hc` from `hono/client`) and TanStack Query hooks live in each app, not in a shared package:

- each app creates its own typed `hc()` client in `lib/api-client.ts` using a type-only import of the Hono app type from `packages/api`
- query-key factories (shared string constants) live in `packages/validation` alongside the schemas they correspond to
- TanStack Query hooks are defined in each app's `features/` directories, colocated with the screens that use them
- `QueryClient` instantiation and `QueryClientProvider` wrapping live in each app's root layout
- use `gcTime` (not `cacheTime` — renamed in TanStack Query v5) for all cache lifetime configuration

This avoids a shared package that would need platform-specific auth configuration, fight with Better Auth's fetch interceptors, and require Metro resolution hacks for `hono/client`.

### 7.3 `packages/auth`

Responsibilities:

- define Better Auth configuration
- provide auth helpers for server and clients
- expose web auth utilities for session retrieval and route protection
- expose mobile auth helpers for secure token storage and refresh behavior

Important rules:

- expose two distinct entrypoints via `package.json` `exports` map:
  - `@starter/auth/server` — Better Auth configuration, session verification, server-side helpers (Node-only)
  - `@starter/auth/client` — client-safe auth utilities, session types, auth state hooks
- additionally expose `@starter/auth/mobile` — mobile-specific helpers that wrap `@better-auth/expo` (the official Expo integration package). This provides the `expoClient` plugin, session caching via `expo-secure-store`, and automatic session header injection. Do not re-implement this from scratch; use `@better-auth/expo` as the foundation.
- the `server` entrypoint must never be imported by `apps/mobile` or any client-safe package
- the `client` entrypoint must be safe to import from both web and mobile
- known issue: `@better-auth/expo` bundles server and client code together (upstream issue #7603). If this causes React Native deps to leak into the Node backend, wrap it in a re-export shim at the `packages/auth` boundary rather than importing the package directly in server code.

### 7.4 `packages/db`

Responsibilities:

- define Drizzle schema
- define database client creation
- hold migrations
- provide query helpers for the example feature and upload metadata

Important rules:

- keep Better Auth tables logically separated from example app tables
- `drizzle.config.ts` lives in `packages/db/`. Root scripts (`db:generate`, `db:migrate`) must pass `--config packages/db/drizzle.config.ts`. CI's `drizzle-kit check` must also use this flag.

### 7.5 `packages/validation`

Responsibilities:

- define Zod schemas for auth, CRUD, uploads, and shared error shapes
- support reuse across web forms, mobile inputs, and Hono handlers

Important rule:

- one logical contract should have one schema path

### 7.6 UI Components

UI components live inside each app rather than in shared packages:

- `apps/web/components/` — hosts shadcn/ui components, web form wrappers, layouts, and component primitives
- `apps/mobile/src/components/` — hosts React Native component primitives, mobile form inputs, layouts, and navigation shell components

This is intentional: web and mobile do not share UI components (§4.2). Single-consumer packages add configuration overhead (package.json, tsconfig, exports map, Turborepo config) without enabling reuse. If a future app needs to share web components, extract a package at that time.

## 8. Example Feature Set

The starter should ship four working example areas.

### 8.1 Auth Example

Required flows:

- sign up
- sign in
- sign out
- protected web route
- protected mobile screen
- session restoration on app restart

### 8.2 CRUD Example

Use one generic example entity, such as `projects`.

Required flows:

- create project
- list projects
- update project
- delete project
- web form with React Hook Form
- web list screen with server-rendered first load and TanStack Query invalidation after mutations
- mobile list screen with TanStack Query-backed reads and mutations
- mobile form using the same validation schemas

The point is not the entity itself. The point is to provide the reference implementation for how new features should be built.

### 8.3 Upload Example

Required flows:

- request signed upload
- upload file from web
- upload file from mobile
- confirm upload complete
- persist file metadata
- list uploaded files
- delete metadata and optionally delete object

### 8.4 Rate-Limit Example

Required flows:

- one public endpoint with rate limiting
- one auth-sensitive endpoint with stricter rate limiting
- consistent `429` shape and retry guidance

## 9. Auth Plan

Better Auth is the locked auth solution.

### 9.1 Web Auth

Web should use standard session and cookie handling appropriate for Next.js.

Required behavior:

- auth routes mounted in the integrated Hono boundary
- protected web pages use session-aware server logic
- protected API procedures enforce authenticated context

### 9.1.1 Session Security Defaults

Better Auth session cookies must be configured with:

- `httpOnly: true` — prevents JavaScript access to session cookies
- `secure: true` in production — cookies only sent over HTTPS
- `sameSite: 'lax'` — primary CSRF defense (see §9.5)
- session TTL: 7 days (configurable)
- idle timeout: 24 hours of inactivity (configurable)

These defaults must be set in the Better Auth server configuration in `packages/auth`.

### 9.2 Mobile Auth

Mobile must not depend on browser cookies stored in a browser cookie jar.

Required behavior:

- use `@better-auth/expo` with the `expoClient` plugin — this handles session storage in `expo-secure-store`, automatic header injection, and auth state persistence across app restarts. Do not implement this layer from scratch.
- `expoClient` uses cookie-based session auth (same as web) but stores session cookies in `expo-secure-store` instead of browser cookie storage. It automatically attaches the session cookie to outgoing requests.
- mobile sign-in and sign-out flow through the same Better Auth endpoints as web — the server does not need separate mobile-specific auth logic
- the Expo app scheme must be registered in `app.config.ts` and added to `trustedOrigins` in the Better Auth server config. Without this, mobile auth callbacks fail silently. For development use `"exp://**"`; for production use the registered app scheme (e.g. `"myapp://**"`)
- logout and session expiry must be tested explicitly

Known issue: auth persistence (#4570) — verify that `expoClient` SecureStore caching is enabled and confirmed working before building any auth-dependent screens.

### 9.3 Hono Auth Middleware Registration Order

The order in which middleware and routes are registered in Hono is critical for auth. Incorrect ordering causes silent failures that are hard to diagnose.

Required registration order in `packages/api`:

1. CORS middleware — must be first, must cover `/api/auth/*`
2. Better Auth route handler — `app.on(["POST","GET"], "/api/auth/*", ...)`
3. Session injection middleware — sets `c.var.user` and `c.var.session` from the validated session
4. All other route groups — `projects`, `uploads`, `public`, etc.

CORS configuration must use the `CORS_ALLOWED_ORIGINS` environment variable (§17.1) instead of hardcoded origins:

```ts
cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
})
```

Note: `CORS_ALLOWED_ORIGINS` controls browser-enforced CORS policy. Better Auth's `trustedOrigins` (configured in the auth server setup) is a separate concern — it controls which redirect URIs are allowed for auth callbacks. The Expo app scheme (`exp://**` or `myapp://**`) goes in `trustedOrigins`, not in CORS origins. Native mobile HTTP clients do not enforce CORS.

### 9.4 Main Auth Risk

The biggest integration risk in the starter is Better Auth behavior across web and Expo.

Because of that, the first technical spike in implementation should prove:

- web sign-in works
- mobile sign-in works
- the same protected backend route can be called from both clients
- logout and session expiry behave predictably

### 9.5 CSRF Protection

The web app uses cookie-based session auth, which makes state-mutating endpoints vulnerable to cross-site request forgery.

Required mitigation (defense in depth):

- **Primary: SameSite cookies** — Better Auth session cookies must set `SameSite=Lax` (or `Strict`) and `Secure=true` in production. This prevents browsers from sending cookies on cross-origin requests.
- **Secondary: Origin/Host validation** — the Hono middleware must verify that the `Origin` header (or `Referer` if Origin is absent) matches the expected deployment origin for all cookie-authenticated state-mutating requests. Reject mismatched origins with `403 FORBIDDEN`.
- **Additional: custom header** — all `POST`, `PUT`, `PATCH`, and `DELETE` requests from the web app must include `X-Requested-With: XMLHttpRequest`. The middleware rejects cookie-authenticated requests missing this header.
- mobile requests use session cookies injected by `expoClient` but are not vulnerable to CSRF because native HTTP clients do not follow browser same-origin policy

This approach is preferred over CSRF tokens because it is stateless and works naturally with the single-origin deployment model.

## 10. Database Plan

Use Neon Postgres with Drizzle.

### 10.1 Initial Tables

Minimum starter tables:

- Better Auth tables — created and managed by Better Auth's migration system. Reference these tables in the Drizzle schema file with `{ ...betterAuthSchema }` for TypeScript type generation and relation definitions, but do not generate Drizzle migrations for them. Better Auth owns their structure.
- `projects` — id, user_id, name, description, status, timestamps
- `uploads` — id, user_id, object_key, filename, content_type, size_bytes, status, timestamps

### 10.2 Migration Rules

- all schema changes must go through Drizzle migrations
- local development must include a clean way to generate and apply migrations
- deployment documentation must define when migrations run in relation to release

### 10.3 Connection Strategy

Use `pg` (node-postgres) with a standard connection pool. Create the pool once at module scope in `packages/db` using the Neon pooler endpoint (`-pooler` suffix in the connection string).

On Vercel Fluid Compute (the recommended 2026 deployment model), the Node.js process stays warm across invocations. A `pg.Pool` created at module scope persists automatically — no special attachment API is needed.

For local development, the same `pg.Pool` connects to a Neon dev branch or local Postgres instance.

`DATABASE_URL` in `.env.example` must document the pooled connection string format and note that the `-pooler` suffix is required for production.

If a future deployment target requires edge runtime or HTTP-only transport (e.g., Cloudflare Workers), replace `pg.Pool` with `@neondatabase/serverless` HTTP transport at that time.

## 11. Backend Plan

The Hono backend is mounted inside Next.js and remains the only API boundary.

### 11.1 Route Groups

The starter should define at least these route groups:

- `auth`
- `health`
- `projects`
- `uploads`
- `public`

The `health` route must check database connectivity (e.g., `SELECT 1`) and return:
- `200 OK` with `{ status: "ok", db: true, timestamp: "<ISO>" }` when healthy
- `503 Service Unavailable` with `{ status: "degraded", db: false, timestamp: "<ISO>" }` when the database is unreachable

### 11.1.1 Hono Mounting in Next.js

The Hono app is bridged to Next.js route handlers using the `handle` function from `hono/vercel`:

```ts
// apps/web/app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel'
import { app } from '@starter/api'

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

This is the single integration point between Hono and Next.js. All API logic lives in `packages/api`; this file only bridges it.

### 11.2 Response and Error Rules

- response shapes should be typed and predictable
- validation, auth, rate-limit, and unexpected errors should each return a distinct, explicit response
- unexpected errors return safe generic responses while being logged
- use a small stable error code set: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`

### 11.2.1 Authorization Helpers

Beyond authentication (verifying identity), the starter must include reusable authorization helpers:

- `requireAuth` middleware — rejects unauthenticated requests with `401 UNAUTHORIZED`. Applied to all protected route groups.
- `requireResourceOwner(resourceUserId)` helper — compares the authenticated user's ID against the resource owner. Returns `403 FORBIDDEN` if they don't match. Used in update and delete handlers to enforce user-scoped access.

These helpers live in `packages/api` and are demonstrated in the projects and uploads route groups.

### 11.3 Request Logging

The starter includes a minimal request logging layer. A Hono middleware assigns each request a unique ID (via `crypto.randomUUID()`) and stores it in Hono context. All log output includes this request ID for traceability.

Use a simple logger wrapper around `console.info` / `console.warn` / `console.error` that prepends the request ID and timestamp. Errors include stack traces in development and safe summaries in production.

Vercel captures `stdout`/`stderr` as structured logs natively, so a logging framework is not needed at the starter level. When the app grows to need log levels, redaction, or external log shipping, replace the wrapper with `pino`.

### 11.4 Error Response Contract

All app-owned API routes (`projects`, `uploads`, `public`, `health`) must return errors in a consistent shape: `{ code, message }` using the error code set from §11.2. Success responses are route-specific — each handler returns its own typed response shape via `c.json()`.

Better Auth routes (`/api/auth/*`) are exempt from this contract — they return Better Auth's native response format.

Define the shared error type in `packages/validation` and use it across all app-owned route handlers.

## 12. Validation and Forms Plan

### 12.1 Validation Rules

All incoming data should be validated with Zod before business logic runs.

Shared schemas should cover:

- sign-up input
- sign-in input
- project create input
- project update input
- upload session request
- upload confirmation input

### 12.2 Web Forms

Web forms should use React Hook Form with Zod-backed validation and shadcn form wrappers.

The starter must demonstrate:

- client-side validation
- server-side validation reuse
- server error mapping back into fields when relevant

### 12.3 Mobile Forms

Mobile forms should reuse the same validation schemas but use native field components.

The starter must demonstrate:

- native form state
- submission to typed endpoints
- rendering validation errors from the backend error response

## 13. File Upload Plan

Use direct-to-R2 upload flow.

### 13.1 Required Upload Sequence

1. client requests a signed upload session from the backend
2. backend creates a pending metadata record and returns signed upload data
3. client uploads directly to R2
4. client calls backend to confirm upload completion
5. backend marks the upload as complete and returns the stored record

### 13.2 Required Rules

- the backend must create the metadata record before upload starts
- the backend must not mark upload complete until the client confirms completion
- the upload contract must be identical for web and mobile
- platform differences should stay in file picking, not in backend design

### 13.3 Signed URL Security

- expiration: 5 minutes maximum
- maximum file size: set `Content-Length` conditions on the presigned URL where supported. Additionally, validate actual object size via a HEAD request at confirm time — presigned PUT URLs cannot reliably enforce size limits on all S3-compatible stores. Reject and delete objects that exceed the configured maximum (default 50 MB).
- content-type restricted to allowed MIME types at signing time
- the upload-session endpoint must be rate-limited to prevent bulk signed URL generation

### 13.4 Pending Upload Cleanup

Since background jobs are out of scope, upload queries filter out stale `pending` records (older than 1 hour). A `db:cleanup` root script removes them manually. Scheduled cleanup can be added later when a job runner is introduced.

### 13.5 R2 Bucket Configuration

The R2 bucket must be configured for direct browser uploads:

- **CORS rules**: allow `PUT` from the web app origin with `Content-Type` header. Mobile uploads bypass CORS (native HTTP clients).
- **Lifecycle rules**: objects in a `tmp/` prefix (or pending uploads older than 24 hours) should be cleaned up. Since background jobs are out of scope, configure R2 lifecycle rules on the bucket to auto-expire objects in the temp prefix.

Document the required R2 bucket settings in the deployment guide.

## 14. Rate-Limit Plan

Use Upstash Ratelimit.

### 14.1 Initial Policies

Starter policies should include:

- auth sign-in policy
- auth sign-up policy
- public endpoint policy
- upload-session policy

**Algorithm choice:** Use **Fixed Window** for all starter policies. Vercel deploys across multiple regions, and Upstash recommends Fixed Window for multi-region setups because it requires fewer Redis commands per check. Sliding Window is more accurate but has higher Redis command overhead that is not justified in a multi-region starter. Document the tradeoff so teams can switch to Sliding Window for single-region deployments if they need boundary-spike protection.

### 14.2 Required Behavior

- policies should be attachable through reusable middleware
- policy names and limits should be centralized
- `429` responses should include enough data for a client to behave sensibly

### 14.3 Rate Limit Key Strategy

- public/auth endpoints: key by client IP, apply before auth middleware
- authenticated endpoints: key by user ID, apply after auth middleware
- `429` responses must include a `Retry-After` header and use the standard error envelope with code `RATE_LIMITED`

## 15. Web UI Plan

The web app should use shadcn/ui (CLI v4) and Tailwind CSS v4.2. Run `pnpm dlx shadcn@latest init` — the CLI auto-detects Tailwind v4 and configures accordingly. Note: `tailwindcss-animate` is deprecated in v4; shadcn CLI installs `tw-animate-css` instead. Do not manually install `tailwindcss-animate`.

### 15.1 Web Surfaces to Build

- public landing or welcome screen
- auth screens
- protected dashboard shell
- projects list and form
- uploads list and upload form
- rate-limit demo surface or debug page

### 15.2 Design Rules

- keep the UI clean and production-credible, not placeholder quality
- avoid over-designing the starter into a product brand system
- prefer server-rendered first loads on web routes, then hand off interactive server-state behavior to TanStack Query
- define the web design theme in `apps/web/styles/theme.css` using CSS custom properties, following the same design language as the mobile theme file

### 15.3 UI Infrastructure Patterns

The starter must include reference implementations for:

- error boundaries (page-level and inline for forms/mutations)
- loading states (page skeletons, `loading.tsx` Suspense boundaries, inline spinners)
- toast notifications for mutation feedback (use sonner)

These must be demonstrated in the example features so new features can copy the approach.

## 16. Mobile Plan

Use Expo SDK 55 with **Expo Router v7**. Target React Native 0.83, React 19.2.0. SDK 55 enables the **New Architecture** by default — this is required and cannot be disabled for new projects. All native modules used in the starter must support New Architecture.

Expo Router v7 ships native navigation primitives: `Stack.Toolbar`, `Link.AppleZoom`, `Tabs.BottomAccessory`. The mobile surfaces in §16.1 can use these where appropriate instead of building custom nav chrome.

### 16.1 Mobile Surfaces to Build

- sign-in screen
- sign-up screen
- protected home screen
- project list and form screen
- file upload screen

### 16.2 Mobile Rules

- the mobile app should target the same backend via Hono RPC as web
- TanStack Query is the default pattern for mobile reads, mutations, and cache invalidation
- secure auth storage is mandatory
- mobile should not introduce backend-specific behavior that web does not need
- offline mode is deferred
- push notifications are deferred

### 16.3 Mobile Infrastructure Patterns

- auth-gated navigation: root layout checks auth state before rendering protected routes, with a splash screen during session verification
- error and loading patterns: screen-level error boundary, TanStack Query loading/error indicators, toast or alert for mutation feedback
- app lifecycle: check session validity on foreground resume via `AppState` listener; deep linking deferred to v1.1
- network error handling: the mobile app must include a reusable network error boundary that detects when the API is unreachable (wrong URL, no network, server down) and shows a clear "Cannot reach server" state with a retry button. This is critical for developer experience — a misconfigured `EXPO_PUBLIC_API_BASE_URL` should produce an obvious error, not cryptic failures on every screen.

### 16.4 Mobile Development Configuration

- Metro bundler must be configured to resolve pnpm workspace symlinks (see §5.2)
- `EXPO_PUBLIC_API_BASE_URL` must support multiple environments:
  - local development on simulator: `http://localhost:3000`
  - local development on physical device: `http://<LAN_IP>:3000` or tunnel URL
  - staging and production: deployed backend URL
- document the physical device networking setup in the starter README
- Expo development builds via EAS Build are recommended for testing native modules; Expo Go is acceptable for initial development

## 17. Environment and Secrets Plan

The starter must ship with a real `.env.example` and documented variable ownership.

### 17.1 Required Environment Variables

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ACCESS_KEY_ID`
- `CLOUDFLARE_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `EXPO_PUBLIC_API_BASE_URL`
- `CORS_ALLOWED_ORIGINS` (for development: allows mobile clients on different origins)
- `R2_PUBLIC_URL` — public URL or CDN endpoint for serving uploaded files (used by upload list screens)
- `TURBO_TOKEN` — Turborepo remote cache token (CI only, optional for local dev)
- `TURBO_TEAM` — Turborepo team slug for remote cache (CI only, optional for local dev)

### 17.2 Rules

- server-only secrets must never be exposed to mobile or browser bundles
- client-safe env access must be separated from server env access
- the app should fail fast if critical env vars are missing
- environment validation is handled per-app: `apps/web/lib/env.ts` validates server and client env vars using Zod, `apps/mobile/lib/env.ts` validates `EXPO_PUBLIC_*` vars using Zod — both must fail fast at startup if required vars are missing
- CORS configuration must allow requests from the mobile app during development (physical device and emulator origins)
- production CORS can be restrictive since mobile native HTTP clients do not enforce CORS, but Expo Web does

The web app does not need an `API_BASE_URL` environment variable — it uses relative URLs (`/api/...`) since the Hono backend is mounted inside the same Next.js deployment. Only the mobile app needs `EXPO_PUBLIC_API_BASE_URL` to point at the deployed web backend.

## 18. Developer Experience Plan

### 18.1 Root Scripts

The root workspace should expose at least:

- `dev` — starts the web app (default for most development)
- `dev:web` — starts the web app only
- `dev:mobile` — starts the Expo mobile app only
- `dev:all` — starts both web and mobile in parallel via Turborepo
- `build`
- `lint`
- `format`
- `typecheck`
- `test`
- `test:web`
- `test:mobile`
- `db:generate`
- `db:migrate`
- `db:push` only if intentionally supported
- `db:seed` — populate development database with sample users, projects, and uploads
- `db:cleanup` — remove stale pending upload records
- `db:reset` — drop and recreate database, run migrations, then seed (development only)
- `clean` — removes `node_modules`, `.turbo`, `.next`, `.expo`, and `*.tsbuildinfo` across the workspace for a fresh start

### 18.2 Quality Rules

- Biome 2.x is the only formatter and linter. Use the current stable version (2.4.x).
- Biome v2 changed the config format from v1. Key differences:
  - `ignore` and `include` fields → replaced by a single **`includes`** field
  - workspace fields use camelCase (e.g. `skippedDiagnostics`, not `skipped_diagnostics`)
  - `all: true` in linter config has been **removed** — do not use it
  - suppression comments use `biome-ignore` (not `rome-ignore`)
  - `--apply` CLI flag removed — use `--write` instead
  - After initial install, run `biome migrate --write` to auto-convert any legacy config format
- strict TypeScript is required
- package boundaries should be clean enough that server-only code does not leak into mobile bundles

### 18.3 Local Development Workflow

Required local development experience:
- `pnpm dev` starts the web app by default. `pnpm dev:all` starts both web and mobile via Turborepo. Mobile development is usually run separately since it involves interactive simulator/device workflows.
- web hot-reload must reflect changes in workspace packages without manual rebuild
- mobile must support Expo Go for quick iteration and EAS development builds for native module testing
- database changes: edit Drizzle schema, run `pnpm db:generate` to create migration, run `pnpm db:migrate` to apply
- seed data must create at least: 2 test users, 5 sample projects per user, 3 sample upload records

The `db:seed` script must import from `@starter/auth/server` and use Better Auth's server-side user creation API (e.g., `auth.api.signUpEmail()`) to create test users with hashed passwords. Do not INSERT directly into auth tables — Better Auth manages password hashing and session table population. Seed credentials must be documented in the README (e.g., `test@example.com` / `password123`).

### 18.4 Adding a New Feature

This checklist defines the expected pattern for adding a new resource or feature to a cloned starter:

1. **Schema**: add the Drizzle table definition in `packages/db/schema/`
2. **Migration**: run `pnpm db:generate` → `pnpm db:migrate`
3. **Validation**: add Zod schemas in `packages/validation/` for create, update, and any query params
4. **API routes**: add a route group in `packages/api/routes/` with CRUD handlers, auth middleware, and the standard error contract
5. **Web pages**: add pages in `apps/web/app/(protected)/` with server-rendered list views and client-side TanStack Query for mutations
6. **Web components**: add feature-specific components in `apps/web/features/{name}/`
7. **Mobile screens**: add screens in `apps/mobile/app/` with TanStack Query hooks in `apps/mobile/src/features/{name}/`
8. **Tests**: add Vitest tests for validation schemas and route handlers

This checklist must be included in the starter's README.

## 19. Testing Plan

### 19.1 Unit and Integration Tests

Use Vitest for:

- validation schemas
- route handlers where practical
- auth helpers
- upload flow helpers
- rate-limit middleware behavior

### 19.1.1 Test Database Strategy

Integration tests must not run against production or shared development databases.

Required approach:
- use a dedicated Neon database branch for CI testing, created per CI run or maintained as a persistent test branch
- for local testing, use the development Neon branch or a local Postgres instance
- each test suite that touches the database must run within a transaction that is rolled back after the test completes
- alternatively, use a setup/teardown pattern that truncates test tables between test suites
- add a `TEST_DATABASE_URL` environment variable to `.env.example`

### 19.1.2 External Service Mocking

Tests must not depend on live external services. Use in-memory mocks for R2, a pass-through mock for Upstash rate limiting, and mock auth context for route handler tests. Configure mocks in a shared test setup file.

### 19.2 Web End-to-End Tests

Use Playwright for at least one smoke path:

1. sign up
2. sign in
3. create project
4. edit project
5. upload file
6. verify protected UI state

### 19.3 Mobile Testing

For the starter, mobile coverage can be lighter than web, but it still needs a credible baseline.

Testing framework:
- use Jest with React Native Testing Library (RNTL) for component and screen tests
- use Maestro for E2E smoke tests on mobile (simpler setup than Detox for a starter kit)

Required minimum:
- auth flow smoke coverage (sign in, sign out, session restore)
- project CRUD happy path coverage (list, create, edit, delete)
- upload happy path coverage where practical
- navigation guard behavior (unauthenticated redirect)

## 20. CI Plan

The starter must include CI from the beginning.

### 20.1 CI Stages

1. install dependencies
2. lint with Biome
3. typecheck workspace
4. run unit and integration tests
5. run build validation
6. run supported smoke tests

### 20.2 CI Rules

- CI failures block merge
- CI must pin **Node.js 20.19+ LTS** (Next.js 16 dropped Node 18 support; Expo SDK 55 requires >=20.19.0). Use `node-version: '20.x'` or `'22.x'` in the workflow file.
- generated artifacts that belong in source control must be checked
- migrations must stay in sync with schema changes
- CI must verify that Drizzle migrations are in sync with the current schema by running `drizzle-kit check --config packages/db/drizzle.config.ts`
- CI must run the test suite against a dedicated test database branch
- mobile type checking must be included in the CI typecheck stage
- CI should configure Turborepo remote caching (`TURBO_TOKEN` and `TURBO_TEAM` environment variables) to avoid rebuilding unchanged packages across CI runs. Without remote caching, Turborepo in CI provides no speed benefit over plain pnpm scripts.

## 21. Deployment Plan

### 21.1 Web and Backend Deployment

- deploy `apps/web` to Vercel
- Hono backend ships inside the same deployment boundary
- set Vercel Node.js runtime to **20.x** in project settings (required by Next.js 16 — Node 18 is no longer supported)
- production docs must explain required env vars and migration steps

### 21.2 Mobile Release Path

- build and release `apps/mobile` through Expo tooling
- mobile points at the deployed web backend base URL
- mobile release configuration must distinguish local, staging, and production environments

### 21.3 Preview and Staging Environments

- **Vercel Preview Deployments**: each PR gets a preview deployment. Configure preview-specific environment variables in Vercel's project settings (preview branch DB, etc.).
- **Neon database branches**: use Neon's branching feature to create isolated database copies for preview/staging. Document how to create a branch and set its connection string as the preview `DATABASE_URL`.
- **Mobile staging**: define a staging `EXPO_PUBLIC_API_BASE_URL` pointing to the Vercel preview or staging URL. Document how to switch between environments in `app.config.ts` using Expo's `extra` config or EAS build profiles.

## 22. Implementation Phases

Build the starter in this order.

### Phase 0: Technical Spikes

Prove the highest-risk assumptions before broad implementation.

Deliverables:

- Hono mounted inside Next.js 16 successfully (catch-all route pattern confirmed)
- Better Auth working on web (cookie session, protected route)
- Better Auth working on Expo — verified on **both iOS and Android** (known iOS client import issue #7218 and Android `node:buffer` issue #1551 must both be resolved before proceeding)
- one protected endpoint reachable from both clients

Exit criteria:

- the backend boundary is proven
- the auth model is proven on iOS and Android separately
- `proxy.ts` (Next.js 16) route protection confirmed working

### Phase 1: Monorepo Foundation

Deliverables:

- root workspace config
- Turborepo config
- TypeScript config
- Biome config
- web theme CSS and mobile theme TypeScript file
- web and mobile app skeletons
- package skeletons

Exit criteria:

- workspace installs cleanly
- web and mobile boot locally
- package imports resolve correctly

### Phase 2: Backend Core

Deliverables:

- Hono app composition
- health route
- error contract and response envelope
- validation package with Zod schemas
- typed Hono RPC client setup demonstrated in `apps/web/lib/api-client.ts`
- request logging middleware with request ID propagation

Exit criteria:

- typed requests and responses work for non-auth routes
- health endpoint responds correctly
- Hono app type can be imported by apps as a type-only import for RPC client derivation without bundling server code

### Phase 3: Database and Auth

Deliverables:

- Drizzle schema for auth and example tables
- Neon database connection using `pg` with connection pool (see §10.3)
- migrations
- Better Auth integration with auth routes
- protected route middleware
- user-scoped data access rules
- web cookie-based auth flow
- mobile auth flow with `expoClient` and secure session storage

Exit criteria:

- auth works on both web and mobile
- protected resource access is enforced
- session persistence works on mobile
- CSRF protection is active on web

### Phase 4: Example Features

Deliverables:

- project CRUD flows on web and mobile
- upload flows on web and mobile
- TanStack Query invalidation and refresh patterns demonstrated in both clients
- metadata listing screens
- delete behavior

Exit criteria:

- all example flows work end to end

### Phase 5: Rate Limiting and Hardening

Deliverables:

- Upstash middleware
- endpoint policies
- health checks
- logging baseline
- deployment docs

Exit criteria:

- failure responses are predictable
- required production safeguards are in place

### Phase 6: Test and Release Readiness

Deliverables:

- Vitest coverage for key packages
- Playwright smoke path
- mobile smoke coverage
- CI workflow
- final README and extension docs

Exit criteria:

- a fresh clone can be installed, run, tested, and deployed from documentation alone

## 23. Definition of Done

The starter is done when all of the following are true:

- web and mobile auth work, including protected backend procedures from both clients
- CRUD and upload examples work end to end from both clients
- rate-limited endpoint works as designed
- workspace scripts are complete and documented
- typecheck, Biome, and tests all pass
- migrations are committed
- environment setup and deploy path are documented
- example feature code is easy to delete without breaking infrastructure packages
- adding a new resource follows a clear documented pattern
- the starter does not contain Alloy-specific naming or domain assumptions

## 24. Immediate Next Actions

Use this exact order to start implementation.

1. create the starter repository
2. scaffold pnpm workspace and Turborepo
3. scaffold `apps/web` and verify Hono mounting inside Next.js
4. scaffold `apps/mobile` with Expo SDK 55 + Expo Router v7
5. create `packages/validation` and per-app env files (`apps/web/lib/env.ts`, `apps/mobile/lib/env.ts`)
6. prove Better Auth on web and mobile before building example features
7. add Drizzle and Neon integration
8. build the `projects` CRUD feature end to end
9. build the R2 upload flow end to end
10. add Upstash rate-limit middleware
11. add tests and CI
12. write final setup and clone-extension docs

## 25. Open Risks to Watch During Build

These are the real risks that can slow implementation.

### 25.1 Better Auth Mobile Flow

This is the highest-risk integration point. While both web and mobile use cookie-based sessions via Better Auth, mobile stores session cookies in `expo-secure-store` rather than a browser cookie jar.

### 25.2 Server-Only Imports Leaking Into Mobile

Package boundaries must be enforced carefully so Expo never pulls in server-only code from Hono, Drizzle, or Better Auth server modules.

### 25.3 Upload UX Differences

File selection is different between browser and mobile. Keep the backend contract identical and isolate platform differences in client code only.

### 25.4 Over-Building the Starter

The easiest failure mode is turning the starter into a product. Keep examples generic and resist adding app-specific logic.

### 25.5 Cold Start Performance on Vercel

The catch-all API route `app/api/[[...route]]/route.ts` imports the entire Hono app including Drizzle, Better Auth, all middleware, and all route handlers into a single serverless function. This may cause slow cold starts under Vercel's function size limits. Monitor bundle size and consider route splitting if cold starts exceed acceptable thresholds.

### 25.6 Vercel Platform Coupling

The starter assumes Vercel for web hosting but should document which Vercel-specific features are used (serverless functions, edge middleware, ISR, image optimization) so that migrating to another host is feasible. Avoid deep Vercel-only APIs where a portable alternative exists.

### 25.7 React and React Native Version Alignment

The monorepo must pin React to a version compatible with both Next.js and Expo SDK. Version mismatches between `react`, `react-dom`, and `react-native` can cause subtle runtime bugs.

Pin these versions explicitly in the root `package.json` `pnpm.overrides`:

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.2.0",
      "react-dom": "19.2.0",
      "react-native": "0.83.x"
    }
  }
}
```

**Why 19.2.0:** Expo SDK 55 requires exactly React 19.2.0. Next.js 16 App Router also requires React 19. These are compatible. React 18 is not an option — it is incompatible with Expo SDK 55 and Next.js 16.

Verify alignment after install with `pnpm ls react` to confirm all packages resolve to the same version.

### 25.8 Hono Version Pinning

Use **Hono 4.12.9** (current stable as of March 2026). This release includes CORS wildcard + credentials fixes and resolved several request parsing bugs. The v4.11.0 type inference regression in Turborepo workspaces may still be present — verify that `hc()` return types resolve correctly after installing. Run `pnpm ls hono` to confirm only one version is present across all packages. Do not silently upgrade Hono without re-testing RPC type inference end to end.

### 25.9 Better Auth iOS Client Import Issue

Better Auth v1.5.6 has a known issue (#7218) where importing `@better-auth/expo/client` on **iOS** fails due to bundling differences between iOS and Android. This is separate from the Android `node:buffer` issue. The Phase 0 auth spike must verify Better Auth on **both** platforms explicitly — a green Android test does not confirm iOS is working.

If the iOS client import fails, the workaround is to import from the package root rather than the subpath, or to use a re-export shim in `packages/auth/mobile` that wraps the import with explicit path resolution.

### 25.10 Android Bundling with Better Auth

Android builds can fail because `@better-auth/expo` bundles dependencies that import `node:buffer` — a Node.js built-in that does not exist in React Native's JavaScript environment. This is a known upstream issue (#1551) that manifests as a build failure on Android but not iOS.

Test Better Auth on an Android physical device or emulator early in Phase 3. If the `node:buffer` error appears, add a Metro `resolver.alias` to redirect `node:buffer` to the `buffer` npm polyfill:

```js
config.resolver.extraNodeModules = {
  'node:buffer': require.resolve('buffer'),
};
```

## 26. Final Guidance

Do not start by building screens.

Start by proving the architecture risks:

- integrated Hono inside Next.js
- Better Auth across web and Expo
- typed API access via Hono RPC consumed by both clients

Once those are stable, the rest of the starter becomes straightforward engineering rather than architectural guesswork.
