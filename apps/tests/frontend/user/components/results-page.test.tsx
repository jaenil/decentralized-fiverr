import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Results from "@/app/(root)/dashboard/task/[taskId]/page";
const mocks = vi.hoisted(() => ({ get: vi.fn(), params: { taskId: "7" } }));
vi.mock("next/navigation", () => ({ useParams: () => mocks.params }));
vi.mock("@/lib/api", () => ({ getTaskResults: mocks.get }));
vi.mock("next/image", () => ({ default: () => null }));
const result = (count = 0) => ({
  taskId: 7,
  options: [
    {
      id: 1,
      task_id: 7,
      image_url: "",
      submissions: Array(count).fill({}),
      submissionCount: count,
    },
  ],
});
beforeEach(() => {
  mocks.params.taskId = "7";
  mocks.get.mockResolvedValue(result());
});
it("refreshes results and preserves them on refresh failure", async () => {
  render(<Results />);
  expect(await screen.findByText("Total votes: 0")).toBeVisible();
  mocks.get.mockResolvedValueOnce(result(3));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Total votes: 3")).toBeVisible();
  mocks.get.mockRejectedValueOnce(new Error("Network unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Network unavailable",
  );
  expect(screen.getByText("Total votes: 3")).toBeVisible();
});
it("rejects malformed task IDs without requesting results", async () => {
  mocks.params.taskId = "1.5";
  render(<Results />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid task ID");
  expect(mocks.get).not.toHaveBeenCalled();
});
it("ignores late responses for a previous task", async () => {
  let finish!: (v: ReturnType<typeof result>) => void;
  mocks.get.mockReturnValueOnce(new Promise((r) => (finish = r)));
  const view = render(<Results />);
  mocks.params.taskId = "8";
  mocks.get.mockResolvedValueOnce({ ...result(2), taskId: 8 });
  view.rerender(<Results />);
  expect(await screen.findByText("Total votes: 2")).toBeVisible();
  await act(async () => finish(result(9)));
  expect(screen.queryByText("Total votes: 9")).not.toBeInTheDocument();
});
it("offers retry for initial failure", async () => {
  mocks.get.mockRejectedValueOnce(new Error("Unauthorized"));
  render(<Results />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Total votes: 0")).toBeVisible();
});
