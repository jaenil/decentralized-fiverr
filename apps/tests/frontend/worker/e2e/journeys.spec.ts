import { test, expect, API } from "../../shared/browser";
const task = {
  id: 7,
  title: "Choose a thumbnail",
  amount: "1000000000",
  user_id: 1,
  options: [
    {
      id: 11,
      task_id: 7,
      image_url:
        "https://decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com/1/test/image.jpg",
    },
    { id: 12, task_id: 7, image_url: "https://example.com/thumb1.jpg" },
  ],
};
test("address login, vote, balance and payout initiation", async ({
  page,
  network,
}) => {
  let pending = "0",
    locked = "0",
    votes = 0,
    payouts = 0,
    taskRequests = 0;
  network.handle(async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (!request.url().startsWith(API)) return false;
    if (path === "/v1/workers/signup") {
      expect(request.postDataJSON()).toEqual({ walletId: "worker-A" });
      await route.fulfill({ json: { token: "test-worker-token" } });
      return true;
    }
    expect(request.headers().authorization).toBe("Bearer test-worker-token");
    if (path === "/v1/workers/nextTask") {
      taskRequests++;
      await route.fulfill({
        json: {
          task: votes ? { ...task, id: 8, title: "Another task" } : task,
        },
      });
      return true;
    }
    if (path === "/v1/workers/balance") {
      await route.fulfill({
        json: { pendingAmount: pending, lockedAmount: locked },
      });
      return true;
    }
    if (path === "/v1/workers/submission") {
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({ taskId: 7, optionId: 11 });
      votes++;
      pending = "10000000";
      await route.fulfill({ json: { submissionId: 42, nextTask: null } });
      return true;
    }
    if (path === "/v1/workers/payout") {
      expect(request.method()).toBe("POST");
      payouts++;
      pending = "0";
      locked = "10000000";
      await route.fulfill({
        json: {
          message: "Payout initiated",
          amount: locked,
          signature: "test-reference",
        },
      });
      return true;
    }
    return false;
  });
  await page.goto("/login");
  await page.getByLabel("Wallet Address").fill("worker-A");
  await page.getByRole("button", { name: "Sign In & Start Earning" }).click();
  await expect(page).toHaveURL(/\/task$/);
  await expect(
    page.getByRole("button", { name: "Withdraw SOL" }),
  ).toBeDisabled();
  const image = page.getByRole("img", { name: "Option 11" });
  await expect(image).toHaveAttribute("src", /d3bjd59ge2rr0k.cloudfront.net/);
  await expect(page.getByText("Image unavailable")).toBeVisible();
  const requestsBeforeVote = taskRequests;
  await page.getByRole("button", { name: "Select option 11" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission recorded" }),
  ).toBeVisible();
  await expect(page.getByText("Task ID: 7")).toBeVisible();
  await expect(page.getByText("Selected option: 11")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select option 11" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("0.0100 SOL", { exact: true }).first(),
  ).toBeVisible();
  expect(votes).toBe(1);
  expect(taskRequests).toBe(requestsBeforeVote);
  await page.getByRole("button", { name: "Go to next task" }).click();
  await expect(
    page.getByRole("heading", { name: "Another task" }),
  ).toBeVisible();
  expect(taskRequests).toBe(requestsBeforeVote + 1);
  await page.getByRole("button", { name: "Withdraw SOL" }).click();
  await expect(page.getByText(/Payout of 0.0100 SOL initiated/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw SOL" }),
  ).toBeDisabled();
  expect(payouts).toBe(1);
  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("recovers from task request failure then shows an empty queue", async ({
  page,
  network,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("dw_token", "test-worker-token"),
  );
  let noTasks = false;
  network.handle(async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/workers/balance") {
      await route.fulfill({ json: { pendingAmount: "0", lockedAmount: "0" } });
      return true;
    }
    if (path === "/v1/workers/nextTask") {
      await route.fulfill(
        !noTasks
          ? { status: 500, json: { message: "Temporarily unavailable" } }
          : { status: 404, json: { message: "No more tasks left for you" } },
      );
      return true;
    }
    return false;
  });
  await page.goto("/task");
  await expect(
    page.getByRole("alert").filter({ hasText: "Temporarily unavailable" }),
  ).toHaveText("Temporarily unavailable");
  noTasks = true;
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByRole("heading", { name: "All done!" })).toBeVisible();
});

test("a second tab login synchronizes without deleting the session", async ({
  page,
  context,
  network,
}) => {
  network.handle(async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/workers/signup") {
      await route.fulfill({ json: { token: "two-tab-worker" } });
      return true;
    }
    if (path === "/v1/workers/balance") {
      await route.fulfill({ json: { pendingAmount: "0", lockedAmount: "0" } });
      return true;
    }
    if (path === "/v1/workers/nextTask") {
      await route.fulfill({
        status: 404,
        json: { message: "No more tasks left for you" },
      });
      return true;
    }
    return false;
  });
  await page.goto("/login");
  const second = await context.newPage();
  await second.goto("/login");
  await second.getByLabel("Wallet Address").fill("worker-A");
  await second.getByRole("button", { name: "Sign In & Start Earning" }).click();
  await expect(second).toHaveURL(/\/task$/);
  await expect(page).toHaveURL(/\/task$/);
  expect(await page.evaluate(() => localStorage.getItem("dw_token"))).toBe(
    "two-tab-worker",
  );
});
