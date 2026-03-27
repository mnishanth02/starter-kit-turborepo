import { expect, test } from "@playwright/test";

test.describe("Rate limiting", () => {
	// The /api/public/ping endpoint is rate-limited to 20 requests per minute.
	// Requires Upstash Redis — skipped automatically when rate limiting is inactive.
	test("returns 429 after exceeding rate limit on /api/public/ping", async ({
		request,
	}) => {
		// Probe first request to check if rate limiting is active
		const probe = await request.get("/api/public/ping");
		const hasRateLimitHeader = probe.headers()["x-ratelimit-limit"] !== undefined;

		test.skip(!hasRateLimitHeader, "Rate limiting not active (Upstash not configured)");

		const maxRequests = 25;
		let rateLimited = false;
		let retryAfterHeader: string | null = null;

		for (let i = 0; i < maxRequests; i++) {
			const response = await request.get("/api/public/ping");

			if (response.status() === 429) {
				rateLimited = true;
				retryAfterHeader = response.headers()["retry-after"] ?? null;
				break;
			}
		}

		expect(rateLimited).toBe(true);
		expect(retryAfterHeader).not.toBeNull();
	});
});
