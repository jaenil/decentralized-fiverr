import { WorkerAuthProvider } from "@/contexts/WorkerAuthContext";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Login from "@/app/(auth)/login/page";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
it("prevents empty address signup", () => {
  render(
    <WorkerAuthProvider>
      <Login />
    </WorkerAuthProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Sign In & Start Earning" }),
  ).toBeDisabled();
});
