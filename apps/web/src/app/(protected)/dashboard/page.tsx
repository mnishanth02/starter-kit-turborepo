import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Welcome back
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          {user?.firstName
            ? `${user.firstName}, your Phase 4 surfaces are live.`
            : 'Your Phase 4 surfaces are live.'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          Use the projects and uploads flows to exercise auth, validation, SSR hydration, optimistic
          invalidation, and mutation feedback from a single protected shell.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Projects',
            href: '/projects',
            description: 'SSR-prefetched list, detail, create, edit, and delete flows.',
          },
          {
            title: 'Uploads',
            href: '/uploads',
            description: 'Signed URL creation, direct upload, confirm, and delete.',
          },
          {
            title: 'Rate-limit demo',
            href: '/rate-limit-demo',
            description: 'Placeholder surface ready for the Phase 5 rate-limit exercise.',
          },
        ].map((item) => (
          <Link
            className="rounded-[1.5rem] border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300"
            href={item.href}
            key={item.href}
          >
            <h2 className="text-lg font-semibold text-neutral-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
