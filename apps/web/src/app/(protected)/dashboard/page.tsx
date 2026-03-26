import { currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const user = await currentUser();
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.firstName ?? 'User'}!</p>
    </main>
  );
}
