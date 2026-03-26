import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { NetworkErrorBoundary } from '@/components/network-error-boundary';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkErrorBoundary>{children}</NetworkErrorBoundary>
    </QueryClientProvider>
  );
}
