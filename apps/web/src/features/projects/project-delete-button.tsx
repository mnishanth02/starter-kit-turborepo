'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiResponseError } from '@/lib/api-error';
import { deleteProject, projectQueryKey, projectsQueryKey } from './api';

export function ProjectDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => deleteProject(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.removeQueries({ queryKey: projectQueryKey(id) }),
      ]);
      toast.success('Project deleted');
      router.push('/projects');
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        toast.error(error.message);
        return;
      }

      toast.error('Could not delete project');
    },
  });

  return (
    <button
      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={mutation.isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
          return;
        }

        mutation.mutate();
      }}
      type="button"
    >
      {mutation.isPending ? 'Deleting…' : 'Delete project'}
    </button>
  );
}
