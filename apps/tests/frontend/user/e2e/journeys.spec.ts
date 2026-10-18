import {
  test,
  expect,
  API,
  ADDRESS,
  PNG,
  installWallet,
  connectWallet,
  recordUploads,
} from "../../shared/browser";

test("wallet login signs the backend nonce, persists on refresh, and logs out", async ({
  page,
  network,
}) => {
  await installWallet(page);
  let signed = false;
  network.handle(async (route) => {
    const url = new URL(route.request().url());
    if (url.href === `${API}/v1/users/nonce`) {
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: { nonce: "exact server nonce" } });
      return true;
    }
    if (url.href === `${API}/v1/users/signup`) {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        address: ADDRESS,
        nonce: "exact server nonce",
        name: "Alice",
      });
      expect(body.signature.length).toBeGreaterThan(20);
      signed = true;
      await route.fulfill({ json: { token: "test-user-token" } });
      return true;
    }
    return false;
  });
  await page.goto("/login");
  await connectWallet(page);
  await page.getByPlaceholder("Display name (optional)").fill("Alice");
  await page
    .getByRole("button", { name: "Sign In with Wallet", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(signed).toBe(true);
  expect(await page.evaluate(() => window.__signedMessages)).toEqual([
    "exact server nonce",
  ]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("df_token")),
  ).toBeNull();
});

test("cancelled wallet signing stays on login", async ({ page, network }) => {
  await installWallet(page, { reject: true });
  network.handle(async (route) => {
    if (route.request().url() === `${API}/v1/users/nonce`) {
      await route.fulfill({ json: { nonce: "cancel me" } });
      return true;
    }
    return false;
  });
  await page.goto("/login");
  await connectWallet(page);
  await page
    .getByRole("button", { name: "Sign In with Wallet", exact: true })
    .click();
  await expect(
    page.getByText("Signature request was cancelled."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("creates a task through uploads and refreshes results", async ({
  page,
  network,
}) => {
  await installWallet(page, { seeded: true });
  await recordUploads(page);
  let presigned = 0,
    uploads = 0,
    created = 0,
    votes = 0;
  network.handle(async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === API)
      expect(request.headers().authorization).toBe("Bearer test-user-token");
    if (url.pathname === "/v1/users/preSignedUrl") {
      presigned++;
      await route.fulfill({
        json: { url: `https://uploads.example/${presigned}.png?sig=test` },
      });
      return true;
    }
    if (url.origin === "https://uploads.example") {
      expect(request.method()).toBe("PUT");
      if (request.postDataBuffer())
        expect(request.postDataBuffer()).toEqual(PNG);
      expect(request.headers()["content-type"]).toBe("image/png");
      expect(request.headers().authorization).toBeUndefined();
      uploads++;
      await route.fulfill({ status: 200, body: "" });
      return true;
    }
    if (url.pathname === "/v1/users/task" && request.method() === "POST") {
      created++;
      expect(uploads).toBe(2);
      expect(request.postDataJSON()).toMatchObject({
        title: "Thumbnail vote",
        signature: "manual-signature",
      });
      expect(request.postDataJSON().options).toHaveLength(2);
      await route.fulfill({ json: { id: 7 } });
      return true;
    }
    if (url.pathname === "/v1/users/task" && request.method() === "GET") {
      await route.fulfill({
        json: {
          taskId: 7,
          options: [
            {
              id: 1,
              task_id: 7,
              image_url: "",
              submissions: Array(votes).fill({ id: 1 }),
            },
          ],
        },
      });
      return true;
    }
    return false;
  });
  await page.goto("/dashboard/create");
  await page.getByLabel("Title (optional)").fill("Thumbnail vote");
  await page
    .getByLabel("Solana Transaction Signature")
    .fill("manual-signature");
  await page.getByLabel("Thumbnail options", { exact: true }).setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: PNG },
    { name: "b.png", mimeType: "image/png", buffer: PNG },
  ]);
  await page.getByRole("button", { name: "Create Task", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/task\/7$/);
  await expect(page.getByText("Total votes: 0")).toBeVisible();
  expect(created).toBe(1);
  expect(await page.evaluate(() => Promise.all(window.__uploadBodies))).toEqual(
    [Array.from(PNG), Array.from(PNG)],
  );
  votes = 3;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Total votes: 3")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("ownership error preserves login", async ({ page, network }) => {
  await installWallet(page, { seeded: true });
  network.handle(async (route) => {
    if (new URL(route.request().url()).pathname === "/v1/users/task") {
      await route.fulfill({ status: 403, json: { message: "Unauthorized" } });
      return true;
    }
    return false;
  });
  await page.goto("/dashboard/task/7");
  await expect(
    page.getByRole("alert").filter({ hasText: "Unauthorized" }),
  ).toHaveText("Unauthorized");
  expect(await page.evaluate(() => localStorage.getItem("df_token"))).toBe(
    "test-user-token",
  );
});

test("unexpected service requests are blocked by the test harness", async ({
  page,
  network,
}) => {
  await page.goto("/login");
  await page.evaluate(async () => {
    await fetch("https://unexpected.example/blocked").catch(() => {});
  });
  expect(network.unexpected).toEqual([
    "GET https://unexpected.example/blocked",
  ]);
  network.unexpected.length = 0;
});

test("a second open tab does not erase a successful wallet login", async ({
  page,
  context,
  network,
}) => {
  await installWallet(page);
  await page.goto("/login");
  network.handle(async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/users/nonce") {
      await route.fulfill({ json: { nonce: "two-tab nonce" } });
      return true;
    }
    if (path === "/v1/users/signup") {
      await route.fulfill({ json: { token: "two-tab-token" } });
      return true;
    }
    return false;
  });
  const second = await context.newPage();
  await installWallet(second);
  await second.goto("/login");
  await connectWallet(second);
  await second
    .getByRole("button", { name: "Sign In with Wallet", exact: true })
    .click();
  await expect(second).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(await second.evaluate(() => localStorage.getItem("df_token"))).toBe(
    "two-tab-token",
  );
});
