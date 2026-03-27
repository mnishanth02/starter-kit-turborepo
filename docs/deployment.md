# Deployment Guide

This guide covers deploying the starter-kit monorepo to production, including the Next.js web app, Expo mobile app, and all supporting services.

---

## 1. Prerequisites

| Requirement      | Version   | Notes                                 |
| ---------------- | --------- | ------------------------------------- |
| Node.js          | ≥ 20.19.0 | LTS recommended                       |
| pnpm             | 10.30.1+  | Specified in `packageManager` field   |
| Turbo            | 2.x       | Installed as devDependency            |

**Service accounts you'll need:**

- **[Vercel](https://vercel.com)** — Web app hosting
- **[Neon](https://neon.tech)** — Serverless PostgreSQL
- **[Clerk](https://clerk.com)** — Authentication
- **[Cloudflare R2](https://www.cloudflare.com/products/r2/)** — File storage (S3-compatible)
- **[Upstash](https://upstash.com)** — Redis for rate limiting (optional)

---

## 2. Vercel Setup (Web App)

### Create and link project

1. Import your repo in the [Vercel dashboard](https://vercel.com/new).
2. Set **Framework Preset** to **Next.js**.
3. Set **Root Directory** to `apps/web`.
4. Set **Build Command** to:

   ```
   cd ../.. && pnpm build --filter=@starter/web
   ```

5. Set **Node.js Version** to **20.x** under Project Settings → General.

### Fluid Compute

Enable **Fluid Compute** under Project Settings → Functions to keep connection pools alive across invocations. This is recommended for Neon pooled connections and reduces cold-start overhead.

### Environment variables

Add all variables listed in [Section 7](#7-environment-variables-summary) to Vercel → Project Settings → Environment Variables. Set values per environment (Production, Preview, Development) as needed.

### Custom domain

1. Go to Project Settings → Domains.
2. Add your domain and configure DNS as directed.
3. Update `NEXT_PUBLIC_APP_URL` to `https://your-domain.com`.
4. Update `CORS_ALLOWED_ORIGINS` to include the production URL.

---

## 3. Neon Setup (PostgreSQL)

### Create project

1. Sign in at [Neon Console](https://console.neon.tech).
2. Create a new project. Choose a region close to your Vercel deployment.
3. A default database (`neondb`) and branch (`main`) are created automatically.

### Connection strings

Neon provides two connection string types:

| Type     | Format                                                       | Use for                              |
| -------- | ------------------------------------------------------------ | ------------------------------------ |
| **Pooled**  | `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require` | Production (`DATABASE_URL`)       |
| **Direct**  | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`        | Migrations and local development  |

> **Important:** Use the **pooled** connection string (contains `-pooler` in the hostname) for `DATABASE_URL` in production. Serverless functions open many short-lived connections, and pooling prevents exhausting the database connection limit.

Use the **direct** connection string when running `pnpm db:migrate` locally or in CI.

### Preview branches

For preview/staging environments, create a Neon branch per preview:

```bash
# Via Neon CLI or dashboard
neonctl branches create --project-id <project-id> --name preview-pr-42
```

Each branch gets its own connection string. Set it as the `DATABASE_URL` in the Vercel preview environment.

---

## 4. Clerk Setup (Authentication)

### Create application

1. Sign in at [Clerk Dashboard](https://dashboard.clerk.com).
2. Create an application. Choose your sign-in methods (email, OAuth, etc.).

### API keys

From the Clerk dashboard → API Keys, grab:

| Variable                              | Where used        |
| ------------------------------------- | ----------------- |
| `CLERK_SECRET_KEY`                    | Web (server-side) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Web (client-side) |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Mobile            |

The publishable key is the same value for both web and mobile — it's duplicated under different env var names so each framework can pick it up.

### Webhook endpoint (optional)

If you use Clerk webhooks (e.g., to sync users to your database):

1. Go to Clerk Dashboard → Webhooks.
2. Add endpoint: `https://your-domain.com/api/webhooks`
3. Copy the **Signing Secret** and set it as `CLERK_WEBHOOK_SECRET`.

### Production domain

1. Go to Clerk Dashboard → Domains.
2. Add your production domain.
3. Configure redirect URLs to match your app's sign-in/sign-up pages.

---

## 5. Cloudflare R2 Setup (File Storage)

### Create bucket

1. Sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to R2 Object Storage → Create Bucket.
3. Name it (e.g., `starter-uploads`).

### Generate API token

1. Go to R2 → Manage R2 API Tokens → Create API Token.
2. Grant **Object Read & Write** permissions for your bucket.
3. Copy the credentials:

| Variable                        | Value                       |
| ------------------------------- | --------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`        | Your Cloudflare account ID  |
| `CLOUDFLARE_ACCESS_KEY_ID`     | Token Access Key ID         |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | Token Secret Access Key     |
| `R2_BUCKET_NAME`               | Your bucket name            |
| `R2_PUBLIC_URL`                 | Public bucket URL (if enabled) |

### CORS rules

In the R2 bucket settings, add a CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

For development, add `http://localhost:3000` to `AllowedOrigins`.

### Lifecycle rules (recommended)

Add a lifecycle rule to auto-delete files with the `tmp/` prefix after 24 hours. This cleans up incomplete uploads without manual intervention.

---

## 6. Upstash Setup (Rate Limiting)

### Create Redis database

1. Sign in at [Upstash Console](https://console.upstash.com).
2. Create a new Redis database. Choose a region close to your Vercel deployment.
3. Copy the REST credentials:

| Variable                    | Value                    |
| --------------------------- | ------------------------ |
| `UPSTASH_REDIS_REST_URL`   | REST API URL             |
| `UPSTASH_REDIS_REST_TOKEN` | REST API token           |

> **Note:** Rate limiting is optional. If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set, the rate-limit middleware gracefully degrades — all requests pass through without limits.

---

## 7. Environment Variables Summary

| Variable                              | Required | Source        | Used by     | Notes                                         |
| ------------------------------------- | -------- | ------------- | ----------- | --------------------------------------------- |
| `DATABASE_URL`                        | Yes      | Neon          | Web         | Use pooled connection string in production     |
| `TEST_DATABASE_URL`                   | No       | Neon          | Tests       | Separate database for test runs                |
| `CLERK_SECRET_KEY`                    | Yes      | Clerk         | Web         | Server-side API key                            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Yes      | Clerk         | Web         | Client-side publishable key                    |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Yes      | Clerk         | Mobile      | Same publishable key, Expo env var prefix      |
| `CLERK_WEBHOOK_SECRET`               | No       | Clerk         | Web         | Required only if using webhooks                |
| `CLOUDFLARE_ACCOUNT_ID`              | Yes      | Cloudflare    | Web         | R2 account identifier                          |
| `CLOUDFLARE_ACCESS_KEY_ID`           | Yes      | Cloudflare    | Web         | R2 API token access key                        |
| `CLOUDFLARE_SECRET_ACCESS_KEY`       | Yes      | Cloudflare    | Web         | R2 API token secret                            |
| `R2_BUCKET_NAME`                     | Yes      | Cloudflare    | Web         | R2 bucket name                                 |
| `R2_PUBLIC_URL`                      | No       | Cloudflare    | Web         | Public URL for serving uploaded files           |
| `UPSTASH_REDIS_REST_URL`            | No       | Upstash       | Web         | Rate limiting degrades gracefully without this |
| `UPSTASH_REDIS_REST_TOKEN`          | No       | Upstash       | Web         | Rate limiting degrades gracefully without this |
| `NEXT_PUBLIC_APP_URL`               | Yes      | You           | Web         | e.g., `https://your-domain.com`                |
| `EXPO_PUBLIC_API_BASE_URL`          | Yes      | You           | Mobile      | Points to the web app's API                    |
| `CORS_ALLOWED_ORIGINS`              | Yes      | You           | Web         | Comma-separated origins                        |
| `TURBO_TOKEN`                        | No       | Vercel        | CI          | Remote caching token                           |
| `TURBO_TEAM`                         | No       | Vercel        | CI          | Remote caching team                            |
| `CRON_SECRET`                        | No       | You           | Web         | Secret for cron-triggered endpoints            |
| `ALLOW_DB_RESET`                     | No       | You           | DB scripts  | Set to `true` only in dev to allow `db:reset`  |

---

## 8. Database Migrations

### Running migrations

Always run migrations **before** deploying new code:

```bash
# Apply pending migrations
pnpm db:migrate
```

If you've made schema changes locally and need to generate a new migration file:

```bash
pnpm db:generate   # Generates SQL migration from schema diff
pnpm db:migrate    # Applies it
```

### Other database commands

```bash
pnpm db:push       # Push schema directly (skips migration files — dev only)
pnpm db:seed       # Seed test data (dev only)
pnpm db:reset      # Drop and recreate schema (requires ALLOW_DB_RESET=true)
pnpm db:cleanup    # Delete stale pending uploads older than 1 hour
pnpm db:studio     # Open Drizzle Studio to browse data
```

### Preview environments

For each preview branch, use a Neon database branch (see [Section 3](#3-neon-setup-postgresql)). Run migrations against the branch before the preview deployment goes live.

---

## 9. Preview Environments

### Vercel previews

Vercel automatically creates a preview deployment for every pull request. To give each preview its own database:

1. **Create a Neon branch** for the PR (manually or via CI).
2. **Set the branch's `DATABASE_URL`** in Vercel → Project Settings → Environment Variables → **Preview** scope.
   - Alternatively, use [Neon's Vercel integration](https://neon.tech/docs/guides/vercel) to automate branch creation per preview.
3. **Run migrations** against the preview branch in your CI pipeline.

### Clerk environments

Clerk provides separate **Development** and **Production** instances. Use the development instance keys for preview deployments and production keys for the live site.

---

## 10. Mobile Staging

### Environment switching

The Expo app reads environment variables prefixed with `EXPO_PUBLIC_`:

| Variable                              | Development               | Production                        |
| ------------------------------------- | ------------------------- | --------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`           | `http://localhost:3000`   | `https://your-domain.com`        |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | `pk_test_xxx`             | `pk_live_xxx`                    |

You can switch these via `app.config.ts` (convert from `app.json`) or by using [EAS Build profiles](https://docs.expo.dev/build/eas-json/).

### EAS Build profiles

Create an `eas.json` in `apps/mobile`:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://localhost:3000",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_xxx"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://staging.your-domain.com",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_xxx"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-domain.com",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_xxx"
      }
    }
  }
}
```

Build with:

```bash
cd apps/mobile
eas build --profile preview --platform ios
```

---

## 11. Local Development Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd starter-kit
pnpm install

# 2. Configure environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your credentials

# 3. Set up database (use direct connection string)
pnpm db:push       # Push schema to database
pnpm db:seed       # Seed test data

# 4. Start development servers
pnpm dev           # Start all apps (web + mobile)
pnpm dev:web       # Start web only  → http://localhost:3000
pnpm dev:mobile    # Start mobile only
```

For mobile development, also create `apps/mobile/.env.local`:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

---

## 12. Troubleshooting

### Connection pooling errors

**Symptom:** `too many connections` or `connection terminated unexpectedly` in Vercel function logs.

**Fix:**
- Ensure `DATABASE_URL` uses the **pooled** connection string (`-pooler` in hostname).
- Enable **Fluid Compute** in Vercel to reuse connections across invocations.
- Check the Neon dashboard → Connection Pooling settings.

### CORS issues

**Symptom:** Browser blocks API requests with `CORS policy` errors.

**Fix:**
- Verify `CORS_ALLOWED_ORIGINS` includes the exact origin (protocol + domain + port).
- For local development: `http://localhost:3000,http://localhost:8081`.
- For production: `https://your-domain.com`.
- R2 presigned upload failures: check the R2 bucket CORS rules allow `PUT` from your origin.

### Clerk redirect problems

**Symptom:** Sign-in redirects to the wrong URL or shows "redirect_uri mismatch".

**Fix:**
- In Clerk Dashboard → Paths, ensure your sign-in and sign-up URLs match your app.
- In Clerk Dashboard → Domains, add your production domain.
- Set `NEXT_PUBLIC_APP_URL` correctly in Vercel environment variables.

### Rate limiting not working

**Symptom:** No `X-RateLimit-*` headers in API responses.

**Fix:**
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Rate limiting silently degrades if these are missing.
- Check the Upstash dashboard to confirm the database is active.

### Build failures

**Symptom:** `pnpm build --filter=@starter/web` fails on Vercel.

**Fix:**
- Confirm the build command is `cd ../.. && pnpm build --filter=@starter/web` (must run from repo root).
- Ensure the root directory is set to `apps/web` in Vercel project settings.
- Check that all required environment variables are set for the build environment.

### Stale uploads

**Symptom:** Pending upload records accumulate in the database.

**Fix:**
- Run `pnpm db:cleanup` to delete pending uploads older than 1 hour.
- Set up a Vercel Cron Job or external scheduler to run cleanup periodically. Protect the endpoint with `CRON_SECRET`.
