import { ProjectForm } from '@/features/projects/project-form';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Create</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">New project</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          This form uses React Hook Form with the shared Zod contract and returns API validation
          errors back to the matching fields.
        </p>
      </section>

      <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <ProjectForm mode="create" />
      </section>
    </div>
  );
}
