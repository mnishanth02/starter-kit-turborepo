# Starter Kit

**Full-stack SaaS starter with Next.js, Expo, Hono, and Clerk.**

![Node 20+](https://img.shields.io/badge/Node.js-20.19+-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-55-000020?logo=expo&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-4.x-E36002?logo=hono&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white)

A production-ready monorepo for building cross-platform SaaS applications. Ships with authentication, database, file uploads, rate limiting, and example CRUD features you can replace with your own.

---

## Tech Stack

| Layer            | Technology                          | Purpose                                   |
| ---------------- | ----------------------------------- | ----------------------------------------- |
| **Web**          | Next.js 16 (App Router, Turbopack) | React web application                     |
| **Mobile**       | Expo 55 (Expo Router v7)           | React Native iOS & Android app            |
| **API**          | Hono                                | API routes mounted in Next.js catch-all   |
| **Auth**         | Clerk                               | Authentication for web and mobile         |
| **Database**     | Neon PostgreSQL + Drizzle ORM       | Serverless Postgres with type-safe ORM    |
| **Storage**      | Cloudflare R2                       | S3-compatible file storage (signed URLs)  |
| **Rate Limiting**| Upstash Redis                       | API rate limiting (graceful degradation)  |
| **Validation**   | Zod                                 | Shared request/response schemas           |
| **UI**           | Tailwind CSS + shadcn/ui            | Web component library                     |
| **Data Fetching**| TanStack Query                      | Client-side server state management       |
| **Monorepo**     | Turborepo + pnpm workspaces         | Build orchestration and dependency management |
| **Linting**      | Biome                               | Linting and formatting                    |
| **Testing**      | Vitest                              | Unit and integration tests                |
| **CI**           | GitHub Actions                      | Lint → Typecheck → Build pipeline         |

---

## Project Structure

```
starter-kit/
├── apps/
│   ├── web/                    # Next.js 16 web app
│   │   └── src/app/
│   │       └── api/[...route]/ # Hono API catch-all route
│   └── mobile/                 # Expo 55 React Native app
├── packages/
│   ├── api/                    # Hono API routes & middleware
│   ├── auth/                   # Clerk auth utilities (server + client)
│   ├── db/                     # Drizzle ORM schemas, migrations, seeds
│   ├── validation/             # Zod schemas shared across apps
│   └── typescript-config/      # Shared tsconfig (base, nextjs, react-native)
├── docs/
│   ├── deployment.md           # Full deployment guide
│   └── implementation-plan.md
├── turbo.json                  # Turborepo task configuration
├── biome.json                  # Linting & formatting rules
├── vitest.workspace.ts         # Vitest workspace configuration
└── pnpm-workspace.yaml         # Workspace definitions
```

---

## Prerequisites

| Requirement | Version   | Notes                                    |
| ----------- | --------- | ---------------------------------------- |
| Node.js     | ≥ 20.19.0 | Pinned in `.node-version`                |
| pnpm        | 10.30.1+  | Specified in `packageManager` field      |

**Service accounts:**

| Service                                                | Required | Purpose           |
| ------------------------------------------------------ | -------- | ----------------- |
| [Clerk](https://clerk.com)                             | Yes      | Authentication    |
| [Neon](https://neon.tech)                              | Yes      | PostgreSQL        |
| [Cloudflare R2](https://www.cloudflare.com/products/r2/) | Optional | File storage    |
| [Upstash](https://upstash.com)                        | Optional | Rate limiting     |

**For mobile development:**

- **iOS:** Xcode + iOS Simulator
- **Android:** Android Studio + Android Emulator

---

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd starter-kit

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Clerk, Neon, etc. credentials

# For mobile, also create:
cp .env.example apps/mobile/.env.local
# Keep only EXPO_PUBLIC_* variables in apps/mobile/.env.local

# 4. Push database schema
pnpm db:push

# 5. Seed test data
pnpm db:seed

# 6. Start all apps
pnpm dev
```

The web app runs at **http://localhost:3000**. The Expo dev server starts alongside it.

> **Note:** `.env.example` is a reference for the entire monorepo. Next.js loads from `apps/web/.env.local` and Expo loads from `apps/mobile/.env.local`. See the [Environment Variables](#environment-variables) section for details.

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example). Below is a grouped summary:

### Database (Neon)

| Variable           | Description                                        |
| ------------------ | -------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string (use pooled in prod)  |
| `TEST_DATABASE_URL`| Separate database for test runs (optional)         |

### Auth (Clerk)

| Variable                              | Description                          |
| ------------------------------------- | ------------------------------------ |
| `CLERK_SECRET_KEY`                    | Server-side API key                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Client-side key for web              |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Client-side key for mobile           |
| `CLERK_WEBHOOK_SECRET`               | Webhook signing secret (optional)    |

> The publishable key is the same value — it's duplicated under different prefixes so each framework can access it.

### Storage (Cloudflare R2)

| Variable                        | Description               |
| ------------------------------- | ------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`        | Cloudflare account ID     |
| `CLOUDFLARE_ACCESS_KEY_ID`     | R2 API token access key   |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | R2 API token secret       |
| `R2_BUCKET_NAME`               | R2 bucket name            |
| `R2_PUBLIC_URL`                 | Public URL for files (optional) |

### Rate Limiting (Upstash)

| Variable                    | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Upstash REST URL — rate limiting disabled if unset    |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token — rate limiting disabled if unset  |

### App URLs

| Variable                    | Description                                   |
| --------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`      | Web app URL (e.g., `http://localhost:3000`)    |
| `EXPO_PUBLIC_API_BASE_URL` | API URL for mobile (e.g., `http://localhost:3000`) |
| `CORS_ALLOWED_ORIGINS`     | Comma-separated allowed origins                |

### CI / Misc

| Variable         | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `TURBO_TOKEN`    | Turborepo remote cache token (optional)              |
| `TURBO_TEAM`     | Turborepo remote cache team (optional)               |
| `CRON_SECRET`    | Secret for cron-triggered API endpoints (optional)   |
| `ALLOW_DB_RESET` | Set to `true` to enable `pnpm db:reset` (dev only)  |

---

## Development Workflow

### Running Apps

```bash
pnpm dev            # Start all apps (web + mobile) via Turborepo
pnpm dev:web        # Start web app only  → http://localhost:3000
pnpm dev:mobile     # Start mobile app only
```

### Code Quality

```bash
pnpm lint           # Lint all packages (Biome)
pnpm format         # Auto-format all files (Biome)
pnpm format:check   # Check formatting without writing
pnpm check          # Biome check with auto-fix
pnpm typecheck      # TypeScript type checking across all packages
```

### Testing

```bash
pnpm test           # Run all tests via Turborepo
pnpm test:unit      # Run Vitest directly (all workspaces)
pnpm test:watch     # Run Vitest in watch mode
```

### Other

```bash
pnpm build          # Build all packages
pnpm clean          # Remove all node_modules, build artifacts, and caches
pnpm update         # Update all dependencies to latest versions
```

---

## Database Workflow

All database commands are forwarded to the `@starter/db` package via Turborepo filter.

### Making Schema Changes

```bash
# 1. Edit schema files in packages/db/src/schema/
# 2. Generate a migration file from the diff
pnpm db:generate

# 3. Apply the migration
pnpm db:migrate
```

### Other Database Commands

| Command            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `pnpm db:push`     | Push schema directly to DB (skips migration files — dev only) |
| `pnpm db:seed`     | Populate database with test data                       |
| `pnpm db:reset`    | Drop and recreate schema (requires `ALLOW_DB_RESET=true`) |
| `pnpm db:cleanup`  | Delete stale pending upload records (older than 1 hour) |
| `pnpm db:studio`   | Open Drizzle Studio GUI to browse data                 |

> **Tip:** Use `pnpm db:push` during rapid iteration. Use `pnpm db:generate` + `pnpm db:migrate` when you want to track changes in version-controlled migration files.

---

## Physical Device Networking (Mobile)

When running the mobile app on a physical device, `localhost` won't resolve to your dev machine. Set `EXPO_PUBLIC_API_BASE_URL` to your machine's LAN IP address in `apps/mobile/.env.local`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

Find your LAN IP:
- **macOS:** `ipconfig getifaddr en0`
- **Linux:** `hostname -I`
- **Windows:** `ipconfig` → look for IPv4 Address

> Restart the Expo dev server after changing `.env.local` — Expo does not hot-reload env changes.

---

## Adding a New Feature

1. **Define validation schemas** in `packages/validation/` — shared between API, web, and mobile
2. **Add database table** in `packages/db/src/schema/`
3. **Generate and apply migration:**
   ```bash
   pnpm db:generate && pnpm db:migrate
   ```
4. **Create API route** in `packages/api/src/routes/`
5. **Mount the route** in `packages/api/src/index.ts`
6. **Build web pages** in `apps/web/src/app/(protected)/`
7. **Build mobile screens** in `apps/mobile/app/(protected)/`
8. **Write tests** alongside the code

---

## Removing Example Code

The starter includes example CRUD features (projects, uploads) that you can strip out while keeping all infrastructure intact:

1. Delete route files: `packages/api/src/routes/projects.ts` and `uploads.ts`
2. Remove their mounts from `packages/api/src/index.ts`
3. Delete corresponding web pages and mobile screens
4. Remove schema files from `packages/db/src/schema/`
5. Generate a new migration to drop the tables:
   ```bash
   pnpm db:generate && pnpm db:migrate
   ```

Everything else — auth, error handling, rate limiting, validation setup, database connection — remains intact.

---

## Deployment

See **[docs/deployment.md](docs/deployment.md)** for the full deployment guide, covering:

- **Vercel** — Web app hosting (with Fluid Compute, preview environments)
- **Neon** — PostgreSQL setup (pooled connections, database branches)
- **Clerk** — Auth configuration (API keys, webhooks, production domain)
- **Cloudflare R2** — File storage (bucket, CORS, lifecycle rules)
- **Upstash** — Rate limiting (Redis setup)
- **EAS Build** — Mobile app builds and distribution

### Quick Overview

| Service  | What it deploys         | Dashboard                          |
| -------- | ----------------------- | ---------------------------------- |
| Vercel   | Web app + Hono API      | [vercel.com](https://vercel.com)   |
| EAS      | iOS & Android builds    | [expo.dev](https://expo.dev)       |
| Neon     | PostgreSQL database     | [console.neon.tech](https://console.neon.tech) |

---

## License

MIT
