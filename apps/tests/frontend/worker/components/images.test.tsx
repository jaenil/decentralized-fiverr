import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import TaskCard from "@/components/TaskCard";

const s3 = "https://decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com";
const cdn =
  process.env.NEXT_PUBLIC_CDN_HOSTNAME ?? "d3bjd59ge2rr0k.cloudfront.net";
const task = (url: string) => ({
  id: 7,
  title: "Choose",
  user_id: 1,
  amount: "1000000000",
  options: [{ id: 11, task_id: 7, image_url: url }],
});
it("renders an old S3 key through CloudFront using the real Next Image component", () => {
  render(
    <TaskCard
      task={task(`${s3}/1/old/image.jpg`)}
      submitting={false}
      onVote={() => {}}
    />,
  );
  const image = screen.getByRole("img", { name: "Option 11" });
  expect(image.getAttribute("src")).toContain(
    encodeURIComponent(`https://${cdn}/1/old/image.jpg`),
  );
});
it.each([
  "https://example.com/thumb1.jpg",
  "//example.com/image.jpg",
  "javascript:alert(1)",
  "",
])("does not crash on unsupported image URL %s", (url) => {
  render(<TaskCard task={task(url)} submitting={false} onVote={() => {}} />);
  expect(screen.getByText("Image unavailable")).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("falls back on image load failure and resets for a new image", () => {
  const { rerender } = render(
    <TaskCard
      task={task(`https://${cdn}/missing.jpg`)}
      submitting={false}
      onVote={() => {}}
    />,
  );
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("Image unavailable")).toBeVisible();
  rerender(
    <TaskCard
      task={task(`https://${cdn}/new.jpg`)}
      submitting={false}
      onVote={() => {}}
    />,
  );
  expect(screen.getByRole("img")).toBeVisible();
});
