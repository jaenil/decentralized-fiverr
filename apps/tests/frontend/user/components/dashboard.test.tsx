import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Dashboard from "@/app/(root)/dashboard/page";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
it.each(["-2", "1.5", "abc", "0", "9007199254740992"])(
  "rejects invalid task ID %s",
  (id) => {
    render(<Dashboard />);
    fireEvent.change(screen.getByPlaceholderText("Task ID"), {
      target: { value: id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  },
);
it("opens a valid task", () => {
  render(<Dashboard />);
  fireEvent.change(screen.getByPlaceholderText("Task ID"), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(push).toHaveBeenCalledWith("/dashboard/task/7");
});
