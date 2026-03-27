import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-error';

export default async function HomePage() {
  const { userId } = await auth();
  const ping = await (async () => {
    try {
      return await unwrapResponse<{ message: string; timestamp: string }>(
        await fetch(`${getApiBaseUrl()}/api/public/ping`, {
          cache: 'no-store',
        }),
      );
    } catch {
      return {
        message: 'unavailable',
        timestamp: '',
      };
    }
  })();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Phase 4 reference surface
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-neutral-950">
            Starter Kit with auth, CRUD, uploads, and shared contracts.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
            This landing page now demonstrates the public route alongside the protected app shell,
            giving Phase 4 a concrete before/after entry point for web and mobile.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {userId ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-white"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-neutral-500">Public API ping</p>
          <div className="mt-4 rounded-2xl bg-neutral-950 p-5 text-sm text-neutral-100">
            <p>{ping.message}</p>
            <p className="mt-2 break-all text-neutral-400">{ping.timestamp}</p>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-neutral-600">
            <div className="rounded-2xl bg-neutral-50 p-4">Projects CRUD on web and mobile</div>
            <div className="rounded-2xl bg-neutral-50 p-4">Direct uploads with signed R2 URLs</div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              TanStack Query hydration and mutation toasts
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
