import { expect, test } from "@playwright/test";

test.describe("Public routes", () => {
	test("homepage loads successfully", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/Starter Kit/i);
		// The homepage should render without auth
		await expect(page.locator("body")).toBeVisible();
	});

	test("GET /api/public/ping returns pong", async ({ request }) => {
		const response = await request.get("/api/public/ping");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.message).toBe("pong");
		expect(body.timestamp).toBeDefined();
	});

});
