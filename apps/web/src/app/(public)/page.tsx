import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Starter Kit</h1>
      {userId ? (
        <Link
          href="/dashboard"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Go to Dashboard
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Sign Up
          </Link>
        </div>
      )}
    </main>
  );
}
