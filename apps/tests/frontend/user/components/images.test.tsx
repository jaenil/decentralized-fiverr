import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TaskResults from "@/components/TaskResults";
vi.mock("next/image", () => ({
  default: ({ alt, onError }: { alt: string; onError: () => void }) => (
    <img alt={alt} onError={onError} />
  ),
}));
it("shows image fallback after loading fails", () => {
  render(
    <TaskResults
      options={[
        {
          id: 1,
          task_id: 7,
          image_url: "https://d3bjd59ge2rr0k.cloudfront.net/a.png",
          submissions: [],
          submissionCount: 0,
        },
      ]}
    />,
  );
  fireEvent.error(screen.getByAltText("Option 1"));
  expect(screen.getByText("Image unavailable")).toBeVisible();
  expect(screen.getByText("Total votes: 0")).toBeVisible();
});
it("shows empty results without invalid percentages", () => {
  render(<TaskResults options={[]} />);
  expect(screen.getByText(/No thumbnail options/)).toBeVisible();
  expect(screen.getByText("Total votes: 0")).toBeVisible();
});
