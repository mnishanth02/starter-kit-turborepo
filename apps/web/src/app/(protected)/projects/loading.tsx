export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        <div className="h-56 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      </div>
    </div>
  );
}
