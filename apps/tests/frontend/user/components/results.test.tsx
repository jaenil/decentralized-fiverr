import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TaskResults from "@/components/TaskResults";
vi.mock("next/image", () => ({ default: () => null }));
it("shows vote distribution and zero-vote totals", () => {
  render(
    <TaskResults
      options={[
        {
          id: 1,
          task_id: 7,
          image_url: "",
          submissions: [],
          submissionCount: 3,
        },
        {
          id: 2,
          task_id: 7,
          image_url: "",
          submissions: [],
          submissionCount: 1,
        },
      ]}
    />,
  );
  expect(screen.getByText("75% (3 votes)")).toBeVisible();
  expect(screen.getByText("Total votes: 4")).toBeVisible();
});
