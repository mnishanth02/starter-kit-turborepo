import type { ReactNode } from 'react';
import { UserNav } from '@/components/user-button';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
        <nav>
          <a
            href="/dashboard"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            Dashboard
          </a>
        </nav>
        <UserNav />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
