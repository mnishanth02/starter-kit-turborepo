import { notFound } from 'next/navigation';
import { getProject } from '@/features/projects/api';
import { ProjectForm } from '@/features/projects/project-form';
import { ApiResponseError } from '@/lib/api-error';
import { getServerApiHeaders } from '@/lib/server-api-client';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await getServerApiHeaders();

  try {
    const project = await getProject(id, requestHeaders);

    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Edit</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            Update the shared contract-backed fields and see mutation feedback via toast.
          </p>
        </section>

        <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
          <ProjectForm mode="edit" project={project} />
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
