import type { ReactNode } from 'react';
import { SidebarNav } from '@/components/sidebar-nav';
import { UserNav } from '@/components/user-button';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Starter Kit</p>
            <p className="text-xs text-neutral-500">Protected reference app shell</p>
          </div>
          <UserNav />
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <SidebarNav />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
