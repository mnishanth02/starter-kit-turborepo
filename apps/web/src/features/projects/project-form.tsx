'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateProjectInput,
  createProjectInput,
  type UpdateProjectInput,
  updateProjectInput,
} from '@starter/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiResponseError } from '@/lib/api-error';
import {
  createProject,
  type Project,
  projectQueryKey,
  projectsQueryKey,
  updateProject,
} from './api';

function applyFieldErrors(
  error: ApiResponseError,
  setError: (name: string, error: { message: string }) => void,
) {
  let handledFieldError = false;

  for (const fieldError of error.errors) {
    if (
      fieldError.field === 'name' ||
      fieldError.field === 'description' ||
      fieldError.field === 'status'
    ) {
      handledFieldError = true;
      setError(fieldError.field, { message: fieldError.message });
    }
  }

  if (!handledFieldError) {
    toast.error(error.message);
  }
}

function ProjectFormFields({
  errors,
  isPending,
  register,
  showStatus,
}: {
  errors: Record<string, { message?: string } | undefined>;
  isPending: boolean;
  register: ReturnType<typeof useForm>['register'];
  showStatus: boolean;
}) {
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const descriptionId = `${fieldId}-description`;
  const statusId = `${fieldId}-status`;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-900" htmlFor={nameId}>
          Project name
        </label>
        <input
          id={nameId}
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          disabled={isPending}
          placeholder="Acme launch site"
          {...register('name')}
        />
        {errors.name?.message ? (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-900" htmlFor={descriptionId}>
          Description
        </label>
        <textarea
          id={descriptionId}
          className="min-h-32 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          disabled={isPending}
          placeholder="What is this project for?"
          {...register('description')}
        />
        {errors.description?.message ? (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        ) : (
          <p className="text-sm text-neutral-500">
            Optional. Great for team context and searchability.
          </p>
        )}
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-900" htmlFor={statusId}>
            Status
          </label>
          <select
            id={statusId}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            disabled={isPending}
            {...register('status')}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          {errors.status?.message ? (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CreateProjectForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectInput),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateProjectInput) =>
      createProject({
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : undefined,
      }),
    onSuccess: async (project) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectQueryKey(project.id) }),
      ]);
      toast.success('Project created');
      router.push(`/projects/${project.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        applyFieldErrors(
          error,
          form.setError as unknown as (name: string, error: { message: string }) => void,
        );
        return;
      }

      toast.error('Could not create project');
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => {
        mutation.mutate(values);
      })}
    >
      <ProjectFormFields
        errors={form.formState.errors}
        isPending={mutation.isPending}
        register={form.register as ReturnType<typeof useForm>['register']}
        showStatus={false}
      />

      <div className="flex items-center gap-3">
        <button
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? 'Creating…' : 'Create project'}
        </button>
        <Link
          className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          href="/projects"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function EditProjectForm({ project }: { project: Project }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectInput),
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
      status: project.status,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: UpdateProjectInput) =>
      updateProject(project.id, {
        name: values.name?.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        status: values.status,
      }),
    onSuccess: async (updatedProject) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectQueryKey(project.id) }),
      ]);
      toast.success('Project updated');
      router.push(`/projects/${updatedProject.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        applyFieldErrors(
          error,
          form.setError as (name: string, error: { message: string }) => void,
        );
        return;
      }

      toast.error('Could not update project');
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => {
        mutation.mutate(values);
      })}
    >
      <ProjectFormFields
        errors={form.formState.errors as Record<string, { message?: string } | undefined>}
        isPending={mutation.isPending}
        register={form.register}
        showStatus
      />

      <div className="flex items-center gap-3">
        <button
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          href={`/projects/${project.id}`}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function ProjectForm(props: { mode: 'create' } | { mode: 'edit'; project: Project }) {
  return props.mode === 'create' ? (
    <CreateProjectForm />
  ) : (
    <EditProjectForm project={props.project} />
  );
}
