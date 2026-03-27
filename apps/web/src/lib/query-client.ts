import { QUERY_DEFAULTS } from '@starter/validation';
import { isServer, QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...QUERY_DEFAULTS,
        retry: isServer ? false : 3,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: reuse singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
