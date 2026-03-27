import { RateLimitDemo } from './rate-limit-demo-client';

export default function RateLimitDemoPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Upstash Redis · Sliding window
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Rate-limit demo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          The demo endpoint{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs">
            /api/demo/ping
          </code>{' '}
          is limited to <strong>5 requests per minute</strong> per user via Upstash Redis. Use the
          buttons below to observe the{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs">
            X-RateLimit-*
          </code>{' '}
          headers and the 429 response.
        </p>
      </div>
      <RateLimitDemo />
    </section>
  );
}
