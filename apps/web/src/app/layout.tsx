import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Starter Kit',
  description: 'Full-stack starter kit',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-950">
        <ClerkProvider>
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
