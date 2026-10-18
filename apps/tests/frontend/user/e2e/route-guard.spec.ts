import { test, expect } from "../../shared/browser";
test("requires login before dashboard", async ({ page }) => {
  await page.route("http://127.0.0.1:3999/**", (route) => route.abort());
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Connect your Wallet" }),
  ).toBeVisible();
});
