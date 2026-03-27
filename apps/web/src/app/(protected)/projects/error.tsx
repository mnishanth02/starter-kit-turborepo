'use client';

export default function ProjectsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8">
      <h1 className="text-xl font-semibold text-red-900">Could not load projects</h1>
      <p className="mt-2 text-sm text-red-700">{error.message}</p>
      <button
        className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
