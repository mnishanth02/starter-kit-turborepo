import { expect, test } from "@playwright/test";

// TODO: Set up Clerk Testing Tokens for full E2E auth flows
// See: https://clerk.com/docs/testing/playwright
// This would allow testing sign-in, sign-up, and authenticated routes
// using `setupClerkTestingToken()` before each test.

test.describe("Auth flow", () => {
	test("sign-in page renders with Clerk components", async ({ page }) => {
		await page.goto("/sign-in");
		// Clerk's sign-in component should render on the page
		await expect(page.locator('[class*="cl-rootBox"]')).toBeVisible({
			timeout: 15_000,
		});
	});

	test("sign-up page renders with Clerk components", async ({ page }) => {
		await page.goto("/sign-up");
		// Clerk's sign-up component should render on the page
		await expect(page.locator('[class*="cl-rootBox"]')).toBeVisible({
			timeout: 15_000,
		});
	});

	test("protected route /projects redirects unauthenticated users", async ({
		page,
	}) => {
		await page.goto("/projects");
		await page.waitForURL(/sign-in/);
		expect(page.url()).toContain("sign-in");
	});

	test("protected route /uploads redirects unauthenticated users", async ({
		page,
	}) => {
		await page.goto("/uploads");
		await page.waitForURL(/sign-in/);
		expect(page.url()).toContain("sign-in");
	});

	test("protected route /rate-limit-demo redirects unauthenticated users", async ({
		page,
	}) => {
		await page.goto("/rate-limit-demo");
		await page.waitForURL(/sign-in/);
		expect(page.url()).toContain("sign-in");
	});
});
