import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {children}
      <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-700">
        ← Back to home
      </Link>
    </div>
  );
}
