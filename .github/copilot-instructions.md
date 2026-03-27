# Starter Kit — Copilot Instructions

## Build, test, and lint commands

- Install dependencies with `pnpm install`. The repo expects `pnpm@10` and Node `>=20.19.0`.
- Start everything with `pnpm dev`.
- Start only the web app with `pnpm dev:web`.
- Start only the mobile app with `pnpm dev:mobile`.
- Run lint across the monorepo with `pnpm lint`.
- Run formatting checks with `pnpm format:check`, or apply formatting with `pnpm format`.
- Run type-checking with `pnpm typecheck`.
- Run the unit test workspace with `pnpm test:unit` (the root Vitest workspace only includes `packages/api`, `packages/db`, and `packages/validation`).
- Run all Turbo-managed tests with `pnpm test`.
- Run a single package test file with `pnpm --filter @starter/api exec vitest run src/routes/public.test.ts`.
- Build the repo with `pnpm build`.
- Database workflows are delegated to `@starter/db`: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio`, `pnpm db:seed`, `pnpm db:reset`.

## High-level architecture

- This is a `pnpm` + Turborepo monorepo with two apps in `apps/` and shared packages in `packages/`.
- `apps/web` is a Next.js 16 App Router app. It mounts the Hono server from `@starter/api` through `src/app/api/[[...route]]/route.ts`, so the web UI and API share the same origin.
- `apps/mobile` is an Expo Router app. It talks to the backend over HTTP using `EXPO_PUBLIC_API_BASE_URL`, rather than importing server packages directly at runtime.
- `packages/api` is the backend entrypoint. It owns the Hono app, CORS, request IDs, Clerk auth middleware, route modules, error serialization, rate limiting, and storage-facing upload flows.
- `packages/db` contains Drizzle/Neon database access and schema definitions. Table definitions live under `packages/db/src/schema`, and server code imports `db` from this package instead of creating ad hoc database clients.
- `packages/validation` is the shared contract layer. Zod schemas, shared API error types, and React Query defaults live here and are consumed by the API, web app, and mobile app.
- `packages/auth` is split intentionally: `@starter/auth/server` is for server-only Clerk helpers, while `@starter/auth/client` exposes client-safe shared types only.
- On the web side, route groups separate `(public)`, `(auth)`, and `(protected)` surfaces. Protected pages typically pair Server Component prefetching with TanStack Query hydration, while client-side mutations live in `src/features/**`.
- On the mobile side, screens live in Expo Router route groups, while reusable API wrappers live in `apps/mobile/lib/**` and native providers live in `apps/mobile/providers/**`.

## Key conventions

- Treat the root `.env.example` as a reference only. Runtime env files are split by app: `apps/web/.env.local` for Next.js + mounted API, and `apps/mobile/.env.local` for Expo.
- Do not import server-only code into client bundles. `@starter/db` and `@starter/auth/server` stay on the server; client code should use `@starter/auth/client` and HTTP/API helpers.
- Keep shared request/response rules in `@starter/validation`. If a field is validated by the API, web and mobile forms are expected to reuse the same Zod schema instead of duplicating rules.
- The Next.js proxy in `apps/web/src/proxy.ts` treats `/api/*` as public at the Next layer; route protection for API endpoints happens inside Hono middleware and route handlers.
- In `apps/web`, keep route files under `src/app/**`, interactive UI and mutations under `src/features/**`, reusable infrastructure in `src/lib/**`, and providers in `src/providers/**`.
- React Query defaults are centralized in `@starter/validation` (`QUERY_DEFAULTS`). Reuse shared defaults and existing query helpers before inventing parallel cache behavior.
- Tests are colocated with package source as `src/**/*.test.ts`. The root Vitest workspace does not currently run app-level UI tests, so package tests are the main automated coverage.
- Biome is the single formatter/linter for this repo. Follow the existing defaults: 2-space indentation, single quotes, trailing commas, semicolons, and import organization through Biome.
- The web app carries an explicit warning in `apps/web/CLAUDE.md`: this repo uses Next.js 16, so do not assume older Next.js APIs or file conventions without checking the local docs in `node_modules/next/dist/docs/`.
