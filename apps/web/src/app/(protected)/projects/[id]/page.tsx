import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject } from '@/features/projects/api';
import { ProjectDeleteButton } from '@/features/projects/project-delete-button';
import { ApiResponseError } from '@/lib/api-error';
import { getServerApiHeaders } from '@/lib/server-api-client';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await getServerApiHeaders();

  try {
    const project = await getProject(id, requestHeaders);

    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                {project.status}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {project.name}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
                {project.description ?? 'No description provided yet.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                href={`/projects/${project.id}/edit`}
              >
                Edit project
              </Link>
              <ProjectDeleteButton id={project.id} name={project.name} />
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
