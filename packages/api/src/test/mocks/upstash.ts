export const rateLimitMock = async () => ({
  success: true,
  limit: Number.POSITIVE_INFINITY,
  remaining: Number.POSITIVE_INFINITY,
  reset: Date.now() + 60_000,
});

export class MockRatelimit {
  static slidingWindow(limit: number, window: string) {
    return { type: 'sliding-window', limit, window };
  }

  async limit() {
    return rateLimitMock();
  }

  async blockUntilReady() {
    return rateLimitMock();
  }
}

export class MockRedis {
  constructor(readonly _config: Record<string, unknown> = {}) {}
}

export function resetUpstashMock(): void {}

export function createUpstashRateLimitMock() {
  return {
    Ratelimit: MockRatelimit,
  };
}

export function createUpstashRedisMock() {
  return {
    Redis: MockRedis,
  };
}
