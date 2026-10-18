import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
const mocks = vi.hoisted(() => ({
  wallet: {
    publicKey: { toBase58: (): string => "wallet-A" },
    connected: true,
    signMessage: vi.fn(),
    disconnect: vi.fn(),
  },
  nonce: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => mocks.wallet,
}));
vi.mock("@/lib/api", () => ({ getNonce: mocks.nonce, signup: mocks.signup }));
function Consumer({ name }: { name: string }) {
  const auth = useAuth();
  return (
    <section>
      <output aria-label={name}>
        {auth.isLoggedIn ? "signed in" : "signed out"}
      </output>
      <button onClick={() => auth.login("Alice")}>Login {name}</button>
      <button onClick={() => auth.logout()}>Logout {name}</button>
      {auth.error && <p role="alert">{auth.error}</p>}
    </section>
  );
}
beforeEach(() => {
  mocks.wallet.connected = true;
  mocks.wallet.publicKey = { toBase58: (): string => "wallet-A" };
  mocks.wallet.signMessage.mockResolvedValue(new Uint8Array(64).fill(1));
  mocks.wallet.disconnect.mockResolvedValue(undefined);
  mocks.nonce.mockResolvedValue("server nonce");
  mocks.signup.mockResolvedValue({ token: "token-A" });
});
it("shares successful login and logout across consumers", async () => {
  render(
    <AuthProvider>
      <Consumer name="one" />
      <Consumer name="two" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() =>
    expect(screen.getByLabelText("two")).toHaveTextContent("signed in"),
  );
  fireEvent.click(screen.getByText("Logout two"));
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed out"),
  );
  expect(localStorage.getItem("df_token")).toBeNull();
});
it("does not save an in-flight login after logout", async () => {
  let resolve!: (value: { token: string }) => void;
  mocks.signup.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() => expect(mocks.signup).toHaveBeenCalled());
  fireEvent.click(screen.getByText("Logout one"));
  await act(async () => resolve({ token: "late-token" }));
  expect(screen.getByLabelText("one")).toHaveTextContent("signed out");
  expect(localStorage.getItem("df_token")).toBeNull();
});
it("signs the exact nonce and submits the current wallet", async () => {
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
  expect(
    new TextDecoder().decode(mocks.wallet.signMessage.mock.calls[0][0]),
  ).toBe("server nonce");
  expect(mocks.signup).toHaveBeenCalledWith(
    "wallet-A",
    "server nonce",
    expect.any(String),
    "Alice",
  );
});
it("shows rejected signing without creating a session", async () => {
  mocks.wallet.signMessage.mockRejectedValue(
    new Error("User rejected the request"),
  );
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  expect(await screen.findByRole("alert")).toHaveTextContent("cancelled");
  expect(mocks.signup).not.toHaveBeenCalled();
});
it("invalidates a saved session when the connected account changes", async () => {
  localStorage.setItem("df_token", "saved");
  localStorage.setItem("df_address", "wallet-A");
  const view = render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
  mocks.wallet.publicKey = { toBase58: () => "wallet-B" };
  view.rerender(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed out"),
  );
});
it("preserves a bound session while initial reconnect is pending", async () => {
  localStorage.setItem("df_token", "saved");
  localStorage.setItem("df_address", "wallet-A");
  mocks.wallet.connected = false;
  const view = render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
  mocks.wallet.connected = true;
  view.rerender(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  expect(localStorage.getItem("df_token")).toBe("saved");
  mocks.wallet.connected = false;
  view.rerender(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await waitFor(() => expect(localStorage.getItem("df_token")).toBeNull());
});
it("prevents duplicate signing requests", async () => {
  mocks.wallet.signMessage.mockReturnValue(new Promise(() => {}));
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() =>
    expect(mocks.wallet.signMessage).toHaveBeenCalledTimes(1),
  );
});
it("discards signup when the wallet changes while signing", async () => {
  let finish!: (value: Uint8Array) => void;
  mocks.wallet.signMessage.mockReturnValue(new Promise((r) => (finish = r)));
  const view = render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("Login one"));
  await waitFor(() => expect(mocks.wallet.signMessage).toHaveBeenCalled());
  mocks.wallet.publicKey = { toBase58: () => "wallet-B" };
  view.rerender(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await act(async () => finish(new Uint8Array(64)));
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(localStorage.getItem("df_token")).toBeNull();
});
it("clears shared state on authentication rejection", async () => {
  localStorage.setItem("df_token", "saved");
  localStorage.setItem("df_address", "wallet-A");
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("one")).toHaveTextContent("signed in"),
  );
  act(() => window.dispatchEvent(new Event("df:session-expired")));
  expect(screen.getByLabelText("one")).toHaveTextContent("signed out");
});
it("reconciles a login in another tab without deleting its shared token", async () => {
  render(
    <AuthProvider>
      <Consumer name="one" />
    </AuthProvider>,
  );
  localStorage.setItem("df_token", "other-tab");
  localStorage.setItem("df_address", "wallet-A");
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "df_token", newValue: "other-tab" }),
    ),
  );
  expect(localStorage.getItem("df_token")).toBe("other-tab");
  expect(screen.getByLabelText("one")).toHaveTextContent("signed in");
});
