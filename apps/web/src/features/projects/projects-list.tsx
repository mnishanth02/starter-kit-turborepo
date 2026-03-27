'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { listProjects, projectsQueryKey } from './api';

export function ProjectsList() {
  const {
    data = [],
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: projectsQueryKey,
    queryFn: () => listProjects(),
  });

  if (isError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h2 className="text-lg font-semibold text-red-900">Could not load projects</h2>
        <p className="mt-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Try again in a moment.'}
        </p>
        <button
          className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          onClick={() => void refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        {isLoading ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-900">Loading projects…</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Hydrated data will appear here as soon as the query settles.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-neutral-900">No projects yet</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Create your first project to exercise the shared validation, auth, and mutation flows.
            </p>
            <Link
              className="mt-5 inline-flex rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              href="/projects/new"
            >
              Create project
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((project) => (
        <article
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          key={project.id}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                {project.status}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">{project.name}</h2>
            </div>
            <Link
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              href={`/projects/${project.id}`}
            >
              Open
            </Link>
          </div>

          <p className="mt-4 min-h-12 text-sm leading-6 text-neutral-600">
            {project.description ?? 'No description yet.'}
          </p>

          <div className="mt-5 flex items-center gap-3 text-sm">
            <Link
              className="font-medium text-neutral-900 hover:text-neutral-700"
              href={`/projects/${project.id}`}
            >
              View details
            </Link>
            <Link
              className="text-neutral-500 hover:text-neutral-700"
              href={`/projects/${project.id}/edit`}
            >
              Edit
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
