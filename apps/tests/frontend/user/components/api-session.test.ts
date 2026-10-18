import { expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
it.each([
  ["Invalid or expired token.", true],
  ["Invalid token payload.", true],
  ["Unauthorized", false],
])(
  "handles 403 %s without confusing ownership and auth",
  async (message, expires) => {
    localStorage.setItem("df_token", "current");
    const listener = vi.fn();
    window.addEventListener("df:session-expired", listener);
    await apiClient
      .get("/v1/users/task", {
        adapter: async (config) =>
          Promise.reject({
            config,
            response: { status: 403, data: { message } },
          }),
      })
      .catch(() => {});
    expect(listener).toHaveBeenCalledTimes(expires ? 1 : 0);
    window.removeEventListener("df:session-expired", listener);
  },
);
it("does not expire a new session for an old failed request", async () => {
  localStorage.setItem("df_token", "old");
  const listener = vi.fn();
  window.addEventListener("df:session-expired", listener);
  await apiClient
    .get("/v1/users/task", {
      adapter: async (config) => {
        localStorage.setItem("df_token", "new");
        throw {
          config,
          response: {
            status: 403,
            data: { message: "Invalid or expired token." },
          },
        };
      },
    })
    .catch(() => {});
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener("df:session-expired", listener);
});
