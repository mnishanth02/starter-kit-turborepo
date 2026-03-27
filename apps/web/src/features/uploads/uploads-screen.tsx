'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { toast } from 'sonner';
import { ApiResponseError } from '@/lib/api-error';
import {
  confirmUpload,
  createUploadSession,
  deleteUpload,
  listUploads,
  uploadsQueryKey,
} from './api';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsScreen() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const uploadsQuery = useQuery({
    queryKey: uploadsQueryKey,
    queryFn: async () => (await listUploads()).uploads,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const session = await createUploadSession({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      const uploadResponse = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Direct upload to storage failed');
      }

      try {
        await confirmUpload(session.id, { objectKey: session.objectKey });
      } catch (error) {
        try {
          await deleteUpload(session.id);
        } catch (cleanupError) {
          throw new Error(
            'Upload confirmation failed and cleanup could not be completed. Please try again later.',
            { cause: cleanupError },
          );
        }

        throw new Error(
          'Upload confirmation failed after the file reached storage. The temporary upload was cleaned up, so you can safely try again.',
          { cause: error },
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: uploadsQueryKey });
      toast.success('Upload complete');
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        toast.error(error.message);
        return;
      }

      toast.error(error instanceof Error ? error.message : 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteUpload(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: uploadsQueryKey });
      toast.success('Upload deleted');
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        toast.error(error.message);
        return;
      }

      toast.error('Delete failed');
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">Direct uploads to R2</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Pick a file, request a signed URL, upload directly, then confirm metadata through the
              API.
            </p>
          </div>
          <div>
            <input
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                uploadMutation.mutate(file);
                event.currentTarget.value = '';
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Choose file'}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {uploadsQuery.isError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h2 className="text-lg font-semibold text-red-900">Could not load uploads</h2>
            <p className="mt-2 text-sm text-red-700">
              {uploadsQuery.error instanceof Error
                ? uploadsQuery.error.message
                : 'Try again in a moment.'}
            </p>
            <button
              className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              onClick={() => void uploadsQuery.refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : uploadsQuery.isLoading ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
            Loading uploads…
          </div>
        ) : uploadsQuery.data?.length ? (
          uploadsQuery.data.map((upload) => (
            <article
              className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
              key={upload.id}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  {upload.status}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-950">{upload.filename}</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {upload.contentType} · {formatFileSize(upload.sizeBytes)}
                </p>
              </div>
              <button
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete "${upload.filename}"?`)) {
                    return;
                  }

                  deleteMutation.mutate(upload.id);
                }}
                type="button"
              >
                Delete
              </button>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">No uploads yet</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Use the button above to run the signed upload session flow end-to-end.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
