'use client';

import { useState } from 'react';

type PingResult = {
  id: string;
  status: number;
  ok: boolean;
  limit: string | null;
  remaining: string | null;
  reset: string | null;
  body: string;
};

async function ping(): Promise<PingResult> {
  const res = await fetch('/api/demo/ping');
  const body = await res.text();
  return {
    id: crypto.randomUUID(),
    status: res.status,
    ok: res.ok,
    limit: res.headers.get('x-ratelimit-limit'),
    remaining: res.headers.get('x-ratelimit-remaining'),
    reset: res.headers.get('x-ratelimit-reset'),
    body,
  };
}

export function RateLimitDemo() {
  const [results, setResults] = useState<PingResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handlePing() {
    setLoading(true);
    try {
      const result = await ping();
      setResults((prev) => [result, ...prev].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  async function handleSpam() {
    setLoading(true);
    try {
      const promises = Array.from({ length: 8 }, () => ping());
      const results = await Promise.all(promises);
      setResults((prev) => [...results.reverse(), ...prev].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => void handlePing()}
          type="button"
        >
          Ping once
        </button>
        <button
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => void handleSpam()}
          type="button"
        >
          Spam 8×
        </button>
        {results.length > 0 && (
          <button
            className="text-sm text-neutral-500 hover:text-neutral-700"
            onClick={() => setResults([])}
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No requests yet — hit <strong>Ping once</strong> or <strong>Spam 8×</strong> to see rate
          limit headers in action.
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              className={`flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl border px-5 py-3 text-sm font-mono ${
                r.ok
                  ? 'border-green-200 bg-green-50 text-green-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
              key={r.id}
            >
              <span className="font-bold">{r.status}</span>
              {r.limit && (
                <span>
                  limit&nbsp;<strong>{r.limit}</strong>
                </span>
              )}
              {r.remaining !== null && (
                <span>
                  remaining&nbsp;<strong>{r.remaining}</strong>
                </span>
              )}
              {r.reset && (
                <span className="text-xs opacity-70">
                  reset&nbsp;{new Date(Number(r.reset)).toLocaleTimeString()}
                </span>
              )}
              <span className="ml-auto truncate opacity-60">{r.body.slice(0, 80)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
