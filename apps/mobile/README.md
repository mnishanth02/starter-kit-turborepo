# Mobile App

This Expo app runs from `apps/mobile`, so Expo only loads env files from this directory.

## Environment setup

Create `apps/mobile/.env.local` from `apps/mobile/.env.local.example`.

```bash
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

Set these values:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for the mobile client.
- `EXPO_PUBLIC_API_BASE_URL`: Base URL for the web app backend, for example `http://localhost:3000`.

For a physical device on your LAN, `EXPO_PUBLIC_API_BASE_URL` usually needs your machine IP instead of `localhost`, for example `http://192.168.0.217:3000`.

## Start the app

From the repo root:

```bash
pnpm dev:mobile
```

Or from this directory:

```bash
pnpm dev
```

If you change `apps/mobile/.env.local`, stop Expo and start it again.

## Monorepo env split

- `apps/mobile/.env.local`: Expo-only runtime variables.
- `apps/web/.env.local`: Next.js server and browser variables for the web app.
- `.env.example`: shared reference file for the whole monorepo, not the file Expo loads.
