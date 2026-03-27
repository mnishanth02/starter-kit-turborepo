export function getApiBaseUrl() {
  return typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    : '';
}
