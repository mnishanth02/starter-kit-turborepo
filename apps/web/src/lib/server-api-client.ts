import { headers } from 'next/headers';

export async function getServerApiHeaders() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');

  return cookie ? ({ cookie } satisfies HeadersInit) : undefined;
}
