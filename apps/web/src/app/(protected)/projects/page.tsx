import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import Link from 'next/link';
import { listProjects, projectsQueryKey } from '@/features/projects/api';
import { ProjectsList } from '@/features/projects/projects-list';
import { getQueryClient } from '@/lib/query-client';
import { getServerApiHeaders } from '@/lib/server-api-client';

export default async function ProjectsPage() {
  const queryClient = getQueryClient();
  const requestHeaders = await getServerApiHeaders();

  await queryClient.prefetchQuery({
    queryKey: projectsQueryKey,
    queryFn: () => listProjects(requestHeaders),
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            SSR + hydration reference
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">Projects</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            This page uses a Server Component to prefetch the query, then hands the dehydrated cache
            to the client list so the data is visible immediately after hydration.
          </p>
        </div>
        <Link
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          href="/projects/new"
        >
          New project
        </Link>
      </section>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectsList />
      </HydrationBoundary>
    </div>
  );
}
