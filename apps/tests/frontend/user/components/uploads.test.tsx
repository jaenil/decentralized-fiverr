import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import ImageUploader from "@/components/ImageUploader";
import { useTasks } from "@/hooks/useTasks";
const api = vi.hoisted(() => ({
  getPreSignedUrl: vi.fn(),
  uploadToS3: vi.fn(),
  createTask: vi.fn(),
  getTaskResults: vi.fn(),
}));
vi.mock("@/lib/api", () => api);
vi.mock("next/image", () => ({ default: () => null }));
const file = (name = "a.png", type = "image/png") =>
  new File(["image"], name, { type });
function Uploader() {
  const [files, setFiles] = useState<File[]>([]);
  return <ImageUploader files={files} onChange={setFiles} />;
}
beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  api.getPreSignedUrl.mockResolvedValue({
    url: "https://uploads.example/a.png?signature=test",
  });
  api.uploadToS3.mockResolvedValue(undefined);
  api.createTask.mockResolvedValue({ id: 7 });
});
it("lets users select and remove labelled image options and releases previews", async () => {
  const view = render(<Uploader />);
  fireEvent.change(screen.getByLabelText("Thumbnail options"), {
    target: { files: [file()] },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Remove option 1" }),
  );
  expect(
    screen.queryByRole("button", { name: "Remove option 1" }),
  ).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  view.unmount();
});
it.each(["image/gif", "text/plain"])(
  "rejects unsupported %s files",
  async (type) => {
    render(<Uploader />);
    fireEvent.change(screen.getByLabelText("Thumbnail options"), {
      target: { files: [file("x", type)] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PNG, JPEG, or WebP",
    );
  },
);
it("rejects oversized files and too many options", async () => {
  render(<Uploader />);
  const large = file();
  Object.defineProperty(large, "size", { value: 5 * 1024 * 1024 + 1 });
  fireEvent.change(screen.getByLabelText("Thumbnail options"), {
    target: { files: [large] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("5 MiB");
  fireEvent.change(screen.getByLabelText("Thumbnail options"), {
    target: { files: Array.from({ length: 11 }, () => file()) },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("10");
});
it("does not create a task when an upload fails", async () => {
  api.uploadToS3.mockRejectedValueOnce(new Error("Upload failed"));
  const { result } = renderHook(() => useTasks());
  await act(async () => {
    await expect(
      result.current.submitTask({
        files: [file(), file("b.png")],
        signature: "sig",
      }),
    ).rejects.toThrow();
  });
  expect(api.createTask).not.toHaveBeenCalled();
  expect(result.current.error).toContain("Upload failed");
});
it("prevents duplicate task creation while uploading", async () => {
  let finish!: () => void;
  api.uploadToS3.mockReturnValue(new Promise<void>((r) => (finish = r)));
  const { result } = renderHook(() => useTasks());
  const payload = { files: [file(), file("b.png")], signature: "sig" };
  let first!: Promise<number>;
  let second!: Promise<number>;
  act(() => {
    first = result.current.submitTask(payload);
    second = result.current.submitTask(payload);
  });
  await act(async () => {
    finish();
    await Promise.allSettled([first, second]);
  });
  expect(api.createTask).toHaveBeenCalledTimes(1);
});
it("rejects fewer than two images before any upload", async () => {
  const { result } = renderHook(() => useTasks());
  await act(async () => {
    await expect(
      result.current.submitTask({ files: [file()], signature: "sig" }),
    ).rejects.toThrow("at least 2");
  });
  expect(api.getPreSignedUrl).not.toHaveBeenCalled();
});
it("can retry after a failed upload and keeps uploaded URLs in the create payload", async () => {
  api.uploadToS3.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useTasks());
  const payload = {
    files: [file(), file("b.png")],
    signature: "sig",
    title: "Task",
  };
  await act(async () => {
    await result.current.submitTask(payload).catch(() => {});
  });
  await act(async () => {
    expect(await result.current.submitTask(payload)).toBe(7);
  });
  expect(api.createTask).toHaveBeenCalledWith(
    {
      title: "Task",
      signature: "sig",
      options: [
        { imageUrl: "https://uploads.example/a.png" },
        { imageUrl: "https://uploads.example/a.png" },
      ],
    },
    expect.any(AbortSignal),
  );
});
it("releases remaining previews on unmount", async () => {
  const view = render(<Uploader />);
  fireEvent.change(screen.getByLabelText("Thumbnail options"), {
    target: { files: [file()] },
  });
  await screen.findByRole("button", { name: "Remove option 1" });
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});
it("does not create a task after the create screen unmounts during uploads", async () => {
  let finish!: () => void;
  api.uploadToS3.mockReturnValue(new Promise<void>((r) => (finish = r)));
  const { result, unmount } = renderHook(() => useTasks());
  let pending!: Promise<number>;
  act(() => {
    pending = result.current.submitTask({
      files: [file(), file("b.png")],
      signature: "sig",
    });
  });
  unmount();
  await act(async () => {
    finish();
    await pending.catch(() => {});
  });
  expect(api.createTask).not.toHaveBeenCalled();
});
it("does not create under a different login after uploads finish", async () => {
  localStorage.setItem("df_token", "user-A");
  let finish!: () => void;
  api.uploadToS3.mockReturnValue(new Promise<void>((r) => (finish = r)));
  const { result } = renderHook(() => useTasks());
  let pending!: Promise<number>;
  act(() => {
    pending = result.current.submitTask({
      files: [file(), file("b.png")],
      signature: "sig",
    });
  });
  localStorage.setItem("df_token", "user-B");
  await act(async () => {
    finish();
    await pending.catch(() => {});
  });
  expect(api.createTask).not.toHaveBeenCalled();
});
