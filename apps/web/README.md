# Web App

This Next.js app runs from `apps/web`, so Next loads env files from this directory.

## Environment setup

Create `apps/web/.env.local` from `apps/web/.env.local.example`.

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Set these values:

- `DATABASE_URL`: database connection string for the web app and mounted API.
- `CLERK_SECRET_KEY`: Clerk secret key for server-side auth.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for the browser.
- `CORS_ALLOWED_ORIGINS`: optional today, but used by the API when cross-origin clients are involved.
- `CLERK_WEBHOOK_SECRET`: optional until webhook handling is added.

## Start the app

From the repo root:

```bash
pnpm dev:web
```

Or from this directory:

```bash
pnpm dev
```

The web app serves the backend on the same origin, so the browser does not need a separate API base URL.

## Monorepo env split

- `apps/web/.env.local`: Next.js runtime vars for server and browser.
- `apps/mobile/.env.local`: Expo runtime vars for the mobile app.
- `.env.example`: shared variable reference for the repo.
