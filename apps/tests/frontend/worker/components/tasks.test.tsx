import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import TaskPage from "@/app/task/page";
import { BalanceProvider, useBalance } from "@/contexts/BalanceContext";
import { useNextTask } from "@/hooks/useNextTask";
const api = vi.hoisted(() => ({
  getNextTask: vi.fn(),
  submitOption: vi.fn(),
  getBalance: vi.fn(),
  requestPayout: vi.fn(),
}));
vi.mock("@/lib/api", () => api);
vi.mock("next/image", () => ({ default: () => null }));
const task = {
  id: 7,
  title: "Choose a thumbnail",
  user_id: 1,
  amount: "1000000000",
  options: [
    { id: 11, task_id: 7, image_url: "" },
    { id: 12, task_id: 7, image_url: "" },
  ],
};
beforeEach(() => {
  api.getNextTask.mockResolvedValue({ task });
  api.submitOption.mockResolvedValue({ submissionId: 42, nextTask: null });
  api.getBalance.mockResolvedValue({ pendingAmount: "0", lockedAmount: "0" });
  api.requestPayout.mockResolvedValue({
    message: "Payout initiated",
    amount: "10000000",
    signature: "test-sig",
  });
});
it("refreshes earned balance after one successful vote", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  await screen.findByText("Choose a thumbnail");
  api.getBalance.mockResolvedValue({
    pendingAmount: "10000000",
    lockedAmount: "0",
  });
  fireEvent.click(
    screen.getByRole("button", { name: /Option 11|Select option 11/ }),
  );
  expect(
    await screen.findByRole("heading", { name: "Submission recorded" }),
  ).toBeVisible();
  expect(await screen.findByText("0.0100 SOL")).toBeVisible();
  expect(api.submitOption).toHaveBeenCalledWith(7, 11);
});
it("keeps the task on submission failure and accepts retry", async () => {
  api.submitOption.mockRejectedValueOnce(new Error("offline"));
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  await screen.findByText("Choose a thumbnail");
  fireEvent.click(
    screen.getByRole("button", { name: /Option 11|Select option 11/ }),
  );
  expect(await screen.findByText(/Submission failed/)).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: /Option 11|Select option 11/ }),
  );
  expect(
    await screen.findByRole("heading", { name: "Submission recorded" }),
  ).toBeVisible();
});
it("prevents simultaneous payout calls", async () => {
  const { result } = renderHook(() => useBalance(), {
    wrapper: BalanceProvider,
  });
  api.getBalance.mockResolvedValue({
    pendingAmount: "10000000",
    lockedAmount: "0",
  });
  await act(async () => result.current.fetchBalance());
  api.requestPayout.mockReturnValue(new Promise(() => {}));
  act(() => {
    void result.current.payout();
    void result.current.payout();
  });
  expect(api.requestPayout).toHaveBeenCalledTimes(1);
});
it("does not request a payout with zero balance", async () => {
  const { result } = renderHook(() => useBalance(), {
    wrapper: BalanceProvider,
  });
  await act(async () => result.current.payout());
  expect(api.requestPayout).not.toHaveBeenCalled();
});
it("queues a new balance refresh and ignores the old response", async () => {
  let finish!: (v: { pendingAmount: string; lockedAmount: string }) => void;
  api.getBalance
    .mockReturnValueOnce(new Promise((r) => (finish = r)))
    .mockResolvedValueOnce({ pendingAmount: "10000000", lockedAmount: "0" });
  const { result } = renderHook(() => useBalance(), {
    wrapper: BalanceProvider,
  });
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.fetchBalance();
    second = result.current.fetchBalance();
  });
  await act(async () => {
    finish({ pendingAmount: "0", lockedAmount: "0" });
    await Promise.all([first, second]);
  });
  expect(result.current.pendingSol).toBe("0.0100");
  expect(api.getBalance).toHaveBeenCalledTimes(2);
});
it("does not let an earlier task fetch overwrite the newest task", async () => {
  let finish!: (v: { task: typeof task }) => void;
  api.getNextTask
    .mockReturnValueOnce(new Promise((r) => (finish = r)))
    .mockResolvedValueOnce({ task: { ...task, id: 8 } });
  const { result } = renderHook(() => useNextTask());
  let first!: Promise<void>;
  act(() => {
    first = result.current.fetchNextTask();
  });
  await act(async () => result.current.fetchNextTask());
  await act(async () => {
    finish({ task });
    await first;
  });
  expect(result.current.task?.id).toBe(8);
});
it("disables withdrawal when no funds are available", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  await screen.findByText("Choose a thumbnail");
  expect(screen.getByRole("button", { name: "Withdraw SOL" })).toBeDisabled();
});
it("does not offer another withdrawal when the post-payout balance is unknown", async () => {
  api.getBalance.mockResolvedValue({
    pendingAmount: "10000000",
    lockedAmount: "0",
  });
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  const withdraw = await screen.findByRole("button", { name: "Withdraw SOL" });
  await waitFor(() => expect(withdraw).toBeEnabled());
  api.getBalance.mockRejectedValue(new Error("offline"));
  fireEvent.click(withdraw);
  await screen.findByText(/Could not load balance/);
  expect(withdraw).toBeDisabled();
});
it("keeps the accepted vote when refreshing balance fails", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  await screen.findByText("Choose a thumbnail");
  api.getBalance.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Select option 11" }));
  expect(
    await screen.findByRole("heading", { name: "Submission recorded" }),
  ).toBeVisible();
  expect(await screen.findByText(/Could not load balance/)).toBeVisible();
  expect(screen.queryByText(/Submission failed/)).not.toBeInTheDocument();
});
it("allows retry after failed payout and reports initiation, not completion", async () => {
  api.getBalance.mockResolvedValue({
    pendingAmount: "10000000",
    lockedAmount: "0",
  });
  api.requestPayout.mockRejectedValueOnce(new Error("offline"));
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  const button = await screen.findByRole("button", { name: "Withdraw SOL" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await screen.findByText(/Payout failed/);
  fireEvent.click(button);
  expect(
    await screen.findByText(/Payout of 0.0100 SOL initiated/),
  ).toBeVisible();
});
it("prevents duplicate votes before the response arrives", async () => {
  let finish!: (v: { submissionId: number; nextTask: null }) => void;
  api.submitOption.mockReturnValue(new Promise((r) => (finish = r)));
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  const option = await screen.findByRole("button", {
    name: "Select option 11",
  });
  fireEvent.click(option);
  fireEvent.click(option);
  await act(async () => finish({ submissionId: 42, nextTask: null }));
  expect(api.submitOption).toHaveBeenCalledTimes(1);
});

it("shows the submitted task and option without following the inline nextTask", async () => {
  api.submitOption.mockResolvedValue({
    submissionId: 42,
    nextTask: { ...task, title: "Do not show yet", id: 8 },
  });
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Select option 11" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Submission recorded" }),
  ).toBeVisible();
  expect(screen.getByText("Choose a thumbnail")).toBeVisible();
  expect(screen.getByText("Task ID: 7")).toBeVisible();
  expect(screen.getByText("Selected option: 11")).toBeVisible();
  expect(screen.queryByText("Do not show yet")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Select option 11" }),
  ).not.toBeInTheDocument();
  expect(api.getNextTask).toHaveBeenCalledTimes(1);
  api.getNextTask.mockResolvedValue({
    task: { ...task, id: 8, title: "Next thumbnail" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Go to next task" }));
  expect(await screen.findByText("Next thumbnail")).toBeVisible();
  expect(api.getNextTask).toHaveBeenCalledTimes(2);
  expect(api.submitOption).toHaveBeenCalledTimes(1);
});
it("retains confirmation on next-task failure and shows empty queue only after clicking next", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Select option 12" }),
  );
  await screen.findByRole("heading", { name: "Submission recorded" });
  api.getNextTask.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Go to next task" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Failed to load task",
  );
  expect(screen.getByText("Selected option: 12")).toBeVisible();
  api.getNextTask.mockRejectedValueOnce({ response: { status: 404 } });
  fireEvent.click(screen.getByRole("button", { name: "Go to next task" }));
  expect(await screen.findByText("All done!")).toBeVisible();
  expect(screen.queryByText("Submission recorded")).not.toBeInTheDocument();
  expect(api.submitOption).toHaveBeenCalledTimes(1);
});
it("deduplicates next-task clicks while retaining the confirmation during loading", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Select option 11" }),
  );
  await screen.findByRole("heading", { name: "Submission recorded" });
  let finish!: (value: { task: typeof task }) => void;
  api.getNextTask.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const next = screen.getByRole("button", { name: "Go to next task" });
  fireEvent.click(next);
  fireEvent.click(next);
  expect(screen.getByText("Task ID: 7")).toBeVisible();
  expect(api.getNextTask).toHaveBeenCalledTimes(2);
  await act(async () =>
    finish({ task: { ...task, id: 9, title: "New task" } }),
  );
  expect(await screen.findByText("New task")).toBeVisible();
});

it("allows next task while the post-vote balance refresh is still pending", async () => {
  render(
    <BalanceProvider>
      <TaskPage />
    </BalanceProvider>,
  );
  const option = await screen.findByRole("button", {
    name: "Select option 11",
  });
  api.getBalance.mockReturnValue(new Promise(() => {}));
  fireEvent.click(option);
  const next = await screen.findByRole("button", { name: "Go to next task" });
  expect(next).toBeEnabled();
  api.getNextTask.mockResolvedValue({
    task: { ...task, id: 8, title: "Next thumbnail" },
  });
  fireEvent.click(next);
  expect(await screen.findByText("Next thumbnail")).toBeVisible();
});
