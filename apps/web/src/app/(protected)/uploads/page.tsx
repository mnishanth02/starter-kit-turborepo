import { UploadsScreen } from '@/features/uploads/uploads-screen';

export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Signed upload flow
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">Uploads</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          Request a signed session, upload directly to storage, confirm the object, and manage the
          resulting records from one screen.
        </p>
      </section>

      <UploadsScreen />
    </div>
  );
}
