import { test as base, expect, type Page, type Route } from "@playwright/test";
export { expect };
declare global {
  interface Window {
    __signedMessages: string[];
    __uploadBodies: Promise<number[]>[];
  }
}
export const API = "http://127.0.0.1:3999";
export const ADDRESS = "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi";
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);

type ServiceHandler = (route: Route) => Promise<boolean>;
export const test = base.extend<{
  network: { handle: (handler: ServiceHandler) => void; unexpected: string[] };
}>({
  network: [
    async ({ page, context, baseURL }, use) => {
      const unexpected: string[] = [];
      const pageErrors: string[] = [];
      let handler: ServiceHandler = async () => false;
      const observe = (target: Page) => {
        target.on("pageerror", (error) => pageErrors.push(error.message));
        target.on("console", (message) => {
          if (
            message.type() === "error" &&
            !/Failed to load resource|net::ERR_FAILED|Cross-Origin Request Blocked/.test(
              message.text(),
            )
          )
            pageErrors.push(message.text());
        });
      };
      observe(page);
      context.on("page", observe);
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(baseURL!).origin) {
          if (url.pathname === "/_next/image") {
            await route.fulfill({ contentType: "image/png", body: PNG });
            return;
          }
          await route.continue();
          return;
        }
        // Wallet Adapter imports this stylesheet; keep fonts deterministic and offline.
        if (
          url.origin === "https://fonts.googleapis.com" &&
          url.pathname === "/css2"
        ) {
          await route.fulfill({ contentType: "text/css", body: "" });
          return;
        }
        if (
          (url.origin === API || url.origin === "https://uploads.example") &&
          (await handler(route))
        )
          return;
        unexpected.push(`${route.request().method()} ${url.href}`);
        await route.abort();
      });
      await use({
        handle: (callback) => {
          handler = callback;
        },
        unexpected,
      });
      expect(unexpected, "No unexpected external traffic").toEqual([]);
      expect(pageErrors, "No browser application errors").toEqual([]);
    },
    { auto: true },
  ],
});

export async function installWallet(
  page: Page,
  options: { seeded?: boolean; reject?: boolean } = {},
) {
  await page.addInitScript(
    ({ address, seeded, reject }) => {
      const signedMessages: string[] = [];
      Object.assign(window, { __signedMessages: signedMessages });
      const listeners = new Set<(event: { accounts: unknown[] }) => void>();
      const account = {
        address,
        publicKey: new Uint8Array(32).fill(1),
        chains: ["solana:devnet"],
        features: ["solana:signMessage", "solana:signTransaction"],
      };
      let accounts: (typeof account)[] = [];
      const emit = () =>
        listeners.forEach((listener) => listener({ accounts }));
      const wallet = {
        version: "1.0.0",
        name: "Test Wallet",
        icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
        chains: ["solana:devnet"],
        get accounts() {
          return accounts;
        },
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: async () => {
              accounts = [account];
              emit();
              return { accounts };
            },
          },
          "standard:disconnect": {
            version: "1.0.0",
            disconnect: async () => {
              accounts = [];
              emit();
            },
          },
          "standard:events": {
            version: "1.0.0",
            on: (
              _event: string,
              listener: (event: { accounts: unknown[] }) => void,
            ) => {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
          },
          "solana:signMessage": {
            version: "1.0.0",
            signMessage: async (...inputs: { message: Uint8Array }[]) => {
              signedMessages.push(
                ...inputs.map((input) =>
                  new TextDecoder().decode(input.message),
                ),
              );
              if (reject) throw new Error("User rejected the request");
              return inputs.map((input) => ({
                signedMessage: input.message,
                signature: new Uint8Array(64).fill(1),
                signatureType: "ed25519",
              }));
            },
          },
          "solana:signTransaction": {
            version: "1.0.0",
            supportedTransactionVersions: ["legacy", 0],
            signTransaction: async () => {
              throw new Error("Transaction signing is outside this test");
            },
          },
        },
      };
      type Registry = { register: (...wallets: unknown[]) => void };
      const register = (api: Registry) => api.register(wallet);
      window.addEventListener("wallet-standard:app-ready", (event) =>
        register((event as CustomEvent<Registry>).detail),
      );
      window.dispatchEvent(
        new CustomEvent("wallet-standard:register-wallet", {
          detail: register,
        }),
      );
      if (seeded && !sessionStorage.getItem("fixture-session-seeded")) {
        localStorage.setItem("df_token", "test-user-token");
        localStorage.setItem("df_address", address);
        localStorage.setItem("walletName", JSON.stringify("Test Wallet"));
        sessionStorage.setItem("fixture-session-seeded", "yes");
      }
    },
    {
      address: ADDRESS,
      seeded: options.seeded ?? false,
      reject: options.reject ?? false,
    },
  );
}

export async function connectWallet(page: Page) {
  await page
    .getByRole("button", { name: "Select Wallet", exact: true })
    .click();
  await page.getByRole("button", { name: /Test Wallet/ }).click();
  await expect(
    page.getByRole("button", { name: "Sign In with Wallet", exact: true }),
  ).toBeVisible();
}

// WebKit's protocol omits File request bodies. Observe the real XHR body before
// transport so every browser still verifies bytes without changing app code.
export async function recordUploads(page: Page) {
  await page.addInitScript(() => {
    const bodies: Promise<number[]>[] = [];
    Object.assign(window, { __uploadBodies: bodies });
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if (body instanceof Blob)
        bodies.push(
          body.arrayBuffer().then((bytes) => Array.from(new Uint8Array(bytes))),
        );
      return send.call(this, body);
    };
  });
}
