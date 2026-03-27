import { QUERY_DEFAULTS } from '@starter/validation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { NetworkErrorBoundary } from '@/components/network-error-boundary';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: QUERY_DEFAULTS,
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkErrorBoundary>{children}</NetworkErrorBoundary>
    </QueryClientProvider>
  );
}
