import { expect, test } from "@playwright/test";

test.describe("Health check", () => {
	test("GET /api/health returns valid health response", async ({ request }) => {
		const response = await request.get("/api/health");
		// 200 = fully healthy, 503 = degraded (missing DB or R2) — both are valid
		expect([200, 503]).toContain(response.status());

		const body = await response.json();
		expect(body).toHaveProperty("status");
		expect(body).toHaveProperty("timestamp");
	});
});
