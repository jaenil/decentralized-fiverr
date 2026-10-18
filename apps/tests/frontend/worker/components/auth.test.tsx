import { WorkerAuthProvider } from "@/contexts/WorkerAuthContext";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useWorkerAuth } from "@/hooks/useWorkerAuth";
const signup = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ workerSignup: signup }));
function Consumer({ name }: { name: string }) {
  const auth = useWorkerAuth();
  return (
    <section>
      <output aria-label={name}>
        {auth.isLoggedIn ? "signed in" : "signed out"}
      </output>
      <button onClick={() => auth.login("worker-A")}>Login {name}</button>
      <button onClick={auth.logout}>Logout {name}</button>
      {auth.error && <p role="alert">{auth.error}</p>}
    </section>
  );
}
beforeEach(() => {
  signup.mockResolvedValue({ token: "worker-token" });
});
it("shares address login and logout", async () => {
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
      <Consumer name="two" />
    </WorkerAuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() =>
    expect(screen.getByLabelText("two")).toHaveTextContent("signed in"),
  );
  expect(signup).toHaveBeenCalledWith("worker-A");
  fireEvent.click(screen.getByText("Logout two"));
  expect(screen.getByLabelText("one")).toHaveTextContent("signed out");
});
it("rejects a stale login response after logout", async () => {
  let finish!: (v: { token: string }) => void;
  signup.mockReturnValue(new Promise((r) => (finish = r)));
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
    </WorkerAuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  fireEvent.click(screen.getByText("Logout one"));
  await act(async () => finish({ token: "late" }));
  expect(localStorage.getItem("dw_token")).toBeNull();
});
it("restores an existing worker session", async () => {
  localStorage.setItem("dw_token", "saved");
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
    </WorkerAuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
});
it("shows signup errors without a session", async () => {
  signup.mockRejectedValue({
    isAxiosError: true,
    response: { data: { message: "Try again later" } },
  });
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
    </WorkerAuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again later");
  expect(localStorage.getItem("dw_token")).toBeNull();
});
it("ignores duplicate login clicks while signup is pending", async () => {
  signup.mockReturnValue(new Promise(() => {}));
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
    </WorkerAuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  fireEvent.click(screen.getByText("Login one"));
  expect(signup).toHaveBeenCalledTimes(1);
});
it("clears all auth consumers on expiration", async () => {
  localStorage.setItem("dw_token", "saved");
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
      <Consumer name="two" />
    </WorkerAuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
  act(() => window.dispatchEvent(new Event("dw:session-expired")));
  expect(screen.getByLabelText("two")).toHaveTextContent("signed out");
  expect(localStorage.getItem("dw_token")).toBeNull();
});
it("reconciles another tab login without deleting the new token", async () => {
  render(
    <WorkerAuthProvider>
      <Consumer name="one" />
    </WorkerAuthProvider>,
  );
  localStorage.setItem("dw_token", "other-tab");
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "dw_token", newValue: "other-tab" }),
    ),
  );
  expect(localStorage.getItem("dw_token")).toBe("other-tab");
  expect(screen.getByLabelText("one")).toHaveTextContent("signed in");
});
