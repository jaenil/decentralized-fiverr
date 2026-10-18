# Frontend Quality and Automated UI Testing Plan

> Use superpowers:executing-plans for each individually approved task. Implement one task, present its changes and verification, and wait for review before starting the next.

**Goal:** Improve and thoroughly test both existing frontends against the backend API exactly as it exists today.

**Architecture:** Keep Next.js, React, Tailwind, Axios, existing routes and shared packages. Use Vitest with React Testing Library for UI behavior and Playwright for browser journeys. Stub API and wallet boundaries in automated tests so PostgreSQL, AWS, Solana RPC, and a Phantom extension are not required.

**Spec:** The user's October 15 frontend-only revision supersedes the earlier repository-wide execution roadmap. Preserve the existing customer nonce/signature flow and worker address-only signup.

## Scope and constraints

- No backend source, configuration, database, migration, API response, authentication, payment, or payout changes.
- Leave `apps/backend/src/routers/users.ts`, including nonce generation and verification, exactly as it is. Replay protection is deferred by explicit user instruction.
- Preserve the worker's current `{ walletId }` signup. Connecting a wallet on the worker frontend would not make its backend authentication verified; do not add that work in this plan.
- Keep the current customer signup `{ address, nonce, signature, name }` and localStorage keys `df_token` / `dw_token`.
- Preserve the user's uncommitted wallet/routing work. All file paths below refer to the current working tree.
- All tests live under `apps/tests`. Put new frontend tests, fixtures, setup, and runner configurations in `apps/tests/frontend/user/` and `apps/tests/frontend/worker/`, with common helpers in `apps/tests/frontend/shared/`. Do not place test files inside either frontend app. Move existing backend suites, their helper, and their runner configuration into `apps/tests/backend/`. Preserve test behavior and assertions; adjust configuration paths and commands for the new location. Backend application code remains out of scope.
- Frontend workspace manifests, `apps/tests` test infrastructure/manifests, documentation, and the resulting root lockfile changes are allowed. No root toolchain or shared-package refactor is included. CI is an optional frontend-only workflow after local tests work.
- Retain the existing response contract: raw submissions are counted on the frontend; bigint wire values stay strings until converted to BigInt for calculations.
- Browser tests prove UI behavior against controlled API responses. They do not prove server authorization, database correctness, real uploads, signature verification, or actual payment execution.
- Every task follows failing test → minimal fix → passing test → focused refactor → review. For setup-only changes, verify the real commands directly.
- The code blocks below are proposed changes for review. They are not application changes already made or a claim that unexecuted examples compile.

## Current frontend status

| Area | Present | Frontend work |
|---|---|---|
| Customer login | Wallet providers under `(root)`, connect button, nonce signing, saved token | Shared auth, restoration/disconnect/account-switch races, errors and tests |
| Customer dashboard | Create link and task-ID lookup | Positive integer validation, accessible labels and navigation tests |
| Upload/create | Multiple previews, S3 PUT, required signature field | Limits, accessible input, cleanup, partial failure, duplicate-submit protection |
| Results | Vote counts and percentages from raw submissions | Refresh, pending/error/empty states, request race handling |
| Worker login | Manual address signup | Shared auth, pending/error/logout behavior; keep API unchanged |
| Worker tasks | Fetch, voting guard, next task, empty state | Balance refresh after success, recoverable errors, stale request handling |
| Worker payout | Button, pending/locked balance, API response message | Truthful initiated state, duplicate request guard, retry/failure tests |
| Quality checks | Frontend type checks pass when run directly | Lint parser rejects TS 7; no frontend automated test harness |

The earlier audit remains a historical assessment. Backend concerns are deferred, not fixed by this frontend plan. Specifically, frontend changes cannot prevent nonce replay, guarantee funding, repair incorrect next-task results from the API, or complete a payout.

## How automated UI testing will work

### Layer 1: Components and page behavior

Use **Vitest + jsdom + React Testing Library + user-event**. Render actual forms/components, type into labelled fields, click buttons, and assert visible output and outgoing API calls. Mock Next navigation and wallet hooks at module boundaries; use actual auth/balance providers for provider integration tests. Test behavior instead of hook internals or snapshots of every JSX tree.

Examples: results percentages, file removal, invalid task IDs, rejected wallet signature, disabled submit button, shared logout state, vote-triggered balance refresh.

### Layer 2: Browser journeys

Use **Playwright** to start only the selected Next.js frontend, open a fresh browser context, exercise real routes, and intercept HTTP calls with deterministic fixtures. Use accessible role/label selectors and Playwright assertions rather than fixed sleeps.

- Customer journeys: dashboard guard; upload/create/results; refresh and ownership errors; login success/cancellation.
- Worker journeys: address signup; vote → next task → updated balance; no tasks; payout initiated/error states.
- Customer login journeys use a test wallet injected before page code runs. It registers through Wallet Standard, implements the connection/sign-message features consumed by the installed adapter, and emits account/disconnect events. It is a test fixture, never a production bypass or real extension with stored seed phrases.
- Test the same nonce string is signed and forwarded to signup; a stubbed signup response does not validate the signature cryptographically.
- Non-login customer journeys may seed localStorage to isolate the page under test. Those tests are explicitly session-seeded; they do not count as login coverage. Use stable wallet connection state where session providers require it.
- Stub presign responses and upload PUT requests; serve deterministic image fixtures from the allowed CDN URL. Assert selected file bytes/content type and request counts, not real AWS delivery.
- Block unexpected requests to the configured backend/upload/RPC hosts with an explicit allowlist. Keep Next.js same-origin assets available. An unhandled service request fails the test instead of reaching a live service.
- Start with desktop Chromium and a narrow mobile viewport. Run critical journeys on Firefox/WebKit after the harness is stable; mobile viewport tests do not emulate Phantom mobile deep links.
- Save screenshots, traces, and videos on failure. Add screenshot regression tests only for stable, reviewed screens with consistent fonts/browser versions.

### Layer 3: Separate integration smoke checks

After UI work is reviewed, manually check the existing backend and a real Phantom wallet using designated development resources. No backend edits are needed. These checks remain separate from deterministic UI CI and are not a substitute for future backend tests.

Sources: [Playwright API mocking](https://playwright.dev/docs/mock), [browser API mocking](https://playwright.dev/docs/mock-browser-apis), [Testing Library principles](https://testing-library.com/docs/guiding-principles/).

## Sequential tasks and acceptance criteria

### Task 1 — Frontend check and test harness

**Files:** both frontend `package.json`; `apps/tests/package.json`, `apps/tests/backend/{users.test.ts,workers.test.ts,helpers/auth.ts,vitest.config.ts}` (relocated existing files), new `apps/tests/frontend/{user,worker}/{vitest.config.ts,playwright.config.ts,components/,e2e/}`, `apps/tests/frontend/shared/setup.ts`, `apps/tests/.gitignore`; lockfile and frontend READMEs.

- [x] Resolve compiler/parser compatibility locally in the frontend workspaces and verify installed resolution. Prefer a frontend-local supported TypeScript version; do not change the backend/root compiler to solve a frontend lint problem.
- [x] Declare wallet/base58 dependencies directly in the customer workspace and test dependencies in the `tests` workspace. Pin mutually compatible versions after inspection rather than blindly upgrading everything.
- [x] Move backend test files/configuration into `apps/tests/backend/` using the mapping below; preserve assertions and helper behavior. Verify test discovery without running requests against the configured backend.
- [x] Add typecheck/component/browser scripts and config, plus one real smoke test per portal.
- [x] Use explicit frontend ports 3001/3002 and disable reuse of arbitrary existing servers during browser tests.
- [x] Run frontend lint, typecheck, component tests, builds, and browser smoke tests. Document any environment-related build limitation accurately.

**Acceptance:** each portal's checks and tests run independently without starting or touching the backend. Review before task 2.

### Task 2 — Customer shared authentication and route guards

**Files:** customer `hooks/useAuth.ts`, new `contexts/AuthContext.tsx`, `(root)/layout.tsx`, dashboard layout, login, navbar and auth/API helpers; matching tests in `apps/tests/frontend/user/`.

- [x] Write provider integration tests for token restoration, login, rejected signing, shared logout, delayed reconnect, account switch, and logout during login.
- [x] Replace independent hook state with one auth provider inside the existing wallet providers. Keep all API payloads unchanged.
- [x] Distinguish `restoring` / `anonymous` / `authenticated` and expose loading/error separately. Guard content until restoration finishes.
- [x] Track actual wallet transitions and a login generation counter; invalidate obsolete responses and prevent double signing. Bind a newly established session to the wallet address locally.
- [x] Clear sessions for genuine authentication rejection; preserve them on resource ownership 403. The backend currently uses 403 for both: use its existing known messages rather than treating every 403 as expiration.

**Acceptance:** all auth consumers agree; reconnect does not erase a session prematurely; delayed login cannot resurrect a logged-out/switched account. No nonce policy changes.

### Task 3 — Worker shared authentication

**Files:** worker auth context/hook/helpers, root/task layouts, login/navbar, tests in `apps/tests/frontend/worker/`.

- [x] Test restoration, successful/failed address signup, duplicate login, logout across consumers and protected navigation.
- [x] Use shared state and explicit readiness, preserving current walletId payload and token key.
- [x] Make the UI accurately describe address sign-in without claiming cryptographic verification or adding wallet requirements.

**Acceptance:** current worker API remains compatible and shared state is consistent.

### Task 4 — Customer task input and uploads

**Files:** dashboard/create pages, `ImageUploader.tsx`, `useTasks.ts`, API helpers and tests in `apps/tests/frontend/user/`.

- [x] Test invalid task IDs, minimum two images, chosen client size/type/count limits, removal, preview cleanup, partial upload failure, retries and rapid duplicate submit.
- [x] Add visible labels and accessible remove actions. Proposed initial client limits: PNG/JPEG/WebP, 5 MiB per image, 2–10 images; review these product limits before implementing.
- [x] Manage preview object URLs in effects and revoke on removal/unmount; add a synchronous submission guard.
- [x] Stop task creation if any upload fails and show a useful retry message. Do not promise cleanup of already uploaded orphan objects; the current backend has no cleanup API.

**Acceptance:** only one create request occurs per active submission; partial failure produces no create request; accessible keyboard controls work. Server-side upload collisions and validation remain deferred.

### Task 5 — Customer results

**Files:** results page, `TaskResults.tsx`, task hook/client response types and tests in `apps/tests/frontend/user/`.

- [x] Test empty options, zero votes, unequal counts, refresh pending/success/failure, malformed task ID, ownership errors and stale responses.
- [x] Normalize raw submission counts locally, add Refresh, retain last successful data after refresh failure, and distinguish initial error from refresh error.
- [x] Add image failure fallback and status/alert announcements.

**Acceptance:** UI counts match fixtures and refresh does not flash misleading empty data. No aggregate endpoint or shared API change.

### Task 6 — Worker task/balance/payout UX

**Files:** `useNextTask.ts`, `BalanceContext.tsx`, task page/card and tests in `apps/tests/frontend/worker/`.

- [x] Test one vote → next task and refreshed balance, duplicate clicks, submission failure/retry, no tasks, stale fetches and concurrent balance refresh.
- [x] Refresh balance after a successful submission and prevent old responses overwriting newer state. A failed balance refresh must not undo a successful vote.
- [x] Add synchronous payout guard; preserve balance until the server response and refresh are processed.
- [x] Test zero balance disables payout, pending UI, API failure, initiation success and locked funds display. Display “initiated” rather than “paid” because the current endpoint does not confirm transfer completion.

**Acceptance:** UI reflects returned balances and handles requests once; tests do not claim the backend transfers SOL or returns the correct next task in all cases.

### Task 7 — Browser regression and frontend delivery checks

**Files:** `apps/tests/frontend/{user,worker}/e2e/`, frontend READMEs; optional `.github/workflows/frontend.yml` with workspace-filtered commands.

- [x] Complete the browser journeys above, keyboard focus/label checks, mobile layout checks, console/page-error assertions and retry behavior.
- [x] Prove fixture isolation with an intentionally unexpected service request test. Use fresh storage/context per test.
- [x] Run all frontend checks/builds; store failure artifacts if CI is approved.
- [x] Provide a per-task change log with exact files, code diff blocks, commands/results and known limitations.

**Acceptance:** both frontend suites pass repeatedly with no database, AWS credentials, real wallet or backend process. Stop for review; backend work stays deferred.

## Proposed code changes, by file

This section specifies the planned edits and shows their key code. Larger auth/wallet fixtures will receive complete reviewed patches in the selected task's implementation plan; the interfaces and behavior below constrain those patches. No incomplete provider snippet should be copied into the app as a finished implementation.

### A. Test layout, manifests and scripts — task 1

Keep all test files and test configuration in the existing `tests` workspace:

```text
apps/tests/
  package.json                  # all test dependencies and test commands
  backend/
    users.test.ts                # relocated existing suite
    workers.test.ts              # relocated existing suite
    helpers/auth.ts              # relocated existing helper
    vitest.config.ts             # discovers backend tests only
  frontend/
    shared/
      setup.ts
      fixtures/
    user/
      vitest.config.ts
      playwright.config.ts
      components/TaskResults.test.tsx
      e2e/route-guard.spec.ts
      e2e/fixtures/
    worker/
      vitest.config.ts
      playwright.config.ts
      components/
      e2e/route-guard.spec.ts
      e2e/voting.spec.ts
```

Add only `typecheck` to each frontend manifest; keep frontend build/lint/dev scripts there:

```json
{ "typecheck": "next typegen && tsc --noEmit" }
```

Update `apps/tests/package.json` so the existing `test` command still starts the backend runner in watch mode, now using its relocated config; add explicit run-once and frontend commands:

```json
{
  "test": "vitest --config backend/vitest.config.ts",
  "test:backend": "vitest run --config backend/vitest.config.ts",
  "test:frontend:user": "vitest run --config frontend/user/vitest.config.ts",
  "test:frontend:worker": "vitest run --config frontend/worker/vitest.config.ts",
  "test:frontend:user:watch": "vitest --config frontend/user/vitest.config.ts",
  "test:frontend:worker:watch": "vitest --config frontend/worker/vitest.config.ts",
  "test:e2e:user": "playwright test --config frontend/user/playwright.config.ts",
  "test:e2e:worker": "playwright test --config frontend/worker/playwright.config.ts"
}
```

Relocate the existing files without changing test assertions:

```text
apps/tests/users.test.ts     → apps/tests/backend/users.test.ts
apps/tests/workers.test.ts   → apps/tests/backend/workers.test.ts
apps/tests/helpers/auth.ts   → apps/tests/backend/helpers/auth.ts
apps/tests/vitest.config.ts  → apps/tests/backend/vitest.config.ts
```

Both suites keep their `./helpers/auth` imports because the relative layout is preserved. Keep `.env` and `.env.example` at `apps/tests/`; never copy credentials into a new fixture. Update the relocated configuration to use explicit paths while retaining its existing execution settings:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
    sequence: { shuffle: false },
    fileParallelism: false,
  },
});
```

The explicit backend root prevents frontend tests from being collected. Verify that discovery lists the same 47 existing backend cases without executing their HTTP requests. The old signup contract and other backend test limitations remain deferred; moving files does not fix them. Frontend verification commands must not invoke the backend suite.

Customer-specific production port change:

```diff
- "start": "next start"
+ "start": "next start -p 3001"
```

Install compatible versions of these packages in **`apps/tests` only**, reusing its existing Vitest dependency and updating the lockfile during approved implementation:

```text
jsdom
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
@playwright/test
react and react-dom matching the frontend versions
@types/react and @types/react-dom
```

Test React dependency resolution must use the same React instance as the frontend components; verify this and deduplicate React/React DOM in Vitest. Provide a frontend-test TypeScript configuration under `apps/tests/frontend/` and check these test files as part of the testing task, since frontend app typechecks no longer include them.

The customer declares the runtime packages it already imports in its own manifest: `@solana/web3.js`, `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, and `bs58`. Toolchain version changes will be documented with observed dependency resolution in task 1.

### B. Component test configuration — task 1

Create `apps/tests/frontend/user/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../../user-frontend/", import.meta.url)) },
    dedupe: ["react", "react-dom"],
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["../shared/setup.ts"],
    include: ["components/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

Create the worker config at `apps/tests/frontend/worker/vitest.config.ts`, changing the alias target to `../../../workers-frontend/`. Its explicit root keeps discovery within worker tests, so both apps can use their own `@/` alias without conflicts.

Create shared `apps/tests/frontend/shared/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

### C. Browser configuration — task 1

Create `apps/tests/frontend/user/playwright.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  outputDir: fileURLToPath(new URL("../../test-results/user/", import.meta.url)),
  reporter: [["list"], ["html", {
    open: "never",
    outputFolder: fileURLToPath(new URL("../../playwright-report/user/", import.meta.url)),
  }]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    cwd: fileURLToPath(new URL("../../../user-frontend/", import.meta.url)),
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_BACKEND_URL: "http://127.0.0.1:3999" },
  },
});
```

Create `apps/tests/frontend/worker/playwright.config.ts` with both frontend URLs set to `http://127.0.0.1:3002`, server `cwd` targeting `../../../workers-frontend/`, and report/output suffixes changed from `user/` to `worker/`. Its existing dev script already selects 3002. These paths launch application code from the correct app while keeping tests and reports under `apps/tests`. A production-build smoke mode will use build/start once the local harness works. Add `playwright-report/` and `test-results/` to `apps/tests/.gitignore`.

### D. Browser smoke test without a backend — task 1

Create `apps/tests/frontend/worker/e2e/route-guard.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("a visitor must sign in before viewing tasks", async ({ page }) => {
  let protectedRequests = 0;
  await page.route("http://127.0.0.1:3999/**", async (route) => {
    protectedRequests += 1;
    await route.abort();
  });
  await page.goto("/task");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Connect & Start Earning" })).toBeVisible();
  expect(protectedRequests).toBe(0);
});
```

The customer equivalent visits `/dashboard` and expects `/login` and the “Connect your Wallet” heading. Login fixture tests are added in task 2, not replaced by token seeding.

### E. Shared auth interfaces and provider placement — tasks 2–3

Create customer `contexts/AuthContext.tsx`; replace `hooks/useAuth.ts` with a context consumer. The provider owns the existing login implementation plus readiness, wallet transition tracking and request invalidation.

```ts
export type SessionStatus = "restoring" | "anonymous" | "authenticated";

export interface AuthState {
  token: string | null;
  status: SessionStatus;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  login: (name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
```

Keep the existing `(root)` wallet providers and insert the auth provider **inside** `WalletProvider`:

```tsx
<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={wallets} onError={onError} autoConnect>
    <WalletModalProvider>
      <AuthProvider>{children}</AuthProvider>
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

Customer `hooks/useAuth.ts` becomes:

```ts
"use client";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
```

Provider implementation rules: restore token and the locally bound address without erasing the token solely because the wallet starts disconnected; compare a connected public key against the bound address; clear on observed connected-to-disconnected transitions; bump a request-generation ref on logout/account change; verify generation and current address before persisting a completed login; guard duplicate login synchronously. Existing sessions without a locally stored address require a new signed login to establish the local binding. None of this changes the signed nonce or backend policy.

Dashboard layout replaces its storage-only guard with shared status:

```tsx
const { status } = useAuth();
useEffect(() => {
  if (status === "anonymous") router.replace("/login");
}, [status, router]);
if (status !== "authenticated") return <p role="status">Loading session…</p>;
```

Worker gets `contexts/WorkerAuthContext.tsx` and the same status contract, with `login(walletId: string): Promise<boolean>` and `logout(): void`. Mount it in `app/layout.tsx` around children. It has no wallet provider requirement; keep `workerSignup(walletId)` unchanged. Use shared status in `app/task/layout.tsx`.

### F. Input validation and image previews — task 4

Customer dashboard submit checks the ID before routing:

```ts
const taskId = Number(id.trim());
if (!/^\d+$/.test(id.trim()) || !Number.isSafeInteger(taskId) || taskId <= 0) {
  setError("Enter a positive whole-number task ID.");
  return;
}
router.push(`/dashboard/task/${taskId}`);
```

`ImageUploader.tsx` creates previews when files change, not during rendering:

```tsx
const [previews, setPreviews] = useState<string[]>([]);
useEffect(() => {
  const urls = files.map((file) => URL.createObjectURL(file));
  setPreviews(urls);
  return () => urls.forEach((url) => URL.revokeObjectURL(url));
}, [files]);
```

Add a labelled file input and named remove button. Use a real browse button for keyboard access, preserving optional drag-and-drop:

```tsx
<label htmlFor="thumbnail-options">Thumbnail options</label>
<input id="thumbnail-options" ref={inputRef} type="file"
  accept="image/png,image/jpeg,image/webp" multiple onChange={handleFiles} />
<button type="button" onClick={() => removeFile(i)}
  aria-label={`Remove option ${i + 1}`}>Remove</button>
```

Here `handleFiles` validates the reviewed limits before updating the controlled `files`; implementation tests pin those limits. Keep the current `/preSignedUrl`, PUT and `/task` API calls. Guard the entire upload/create sequence with a synchronous ref, released in `finally`.

### G. Results refresh and wire normalization — task 5

Use a customer-local wire type matching the backend; do not change shared package contracts in this frontend-only phase:

```ts
export interface TaskResultsWire {
  taskId: number;
  options: Array<{
    id: number;
    image_url: string;
    task_id: number;
    submissions: unknown[];
  }>;
}

export function normalizeResults(data: TaskResultsWire) {
  return {
    ...data,
    options: data.options.map((option) => ({
      ...option,
      submissionCount: option.submissions.length,
    })),
  };
}
```

Use this response type in `getTaskResults`, normalize once, and add a Refresh button. Use a request generation or cancellation to prevent stale results overwriting newer ones. Preserve existing data while refreshing and show refresh errors alongside it.

Create `apps/tests/frontend/user/components/TaskResults.test.tsx` to test displayed behavior:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TaskResults from "@/components/TaskResults";

vi.mock("next/image", () => ({ default: () => null }));

it("shows counts and percentages from normalized options", () => {
  render(<TaskResults options={[
    { id: 1, task_id: 7, image_url: "https://example.com/a.png", submissions: [], submissionCount: 3 },
    { id: 2, task_id: 7, image_url: "https://example.com/b.png", submissions: [], submissionCount: 1 },
  ]} />);
  expect(screen.getByText("75% (3 votes)")).toBeInTheDocument();
  expect(screen.getByText("25% (1 votes)")).toBeInTheDocument();
  expect(screen.getByText("Total votes: 4")).toBeInTheDocument();
});
```

This first characterizes current rendering. Add a separate failing test for singular “1 vote” before fixing that copy; image behavior is exercised separately and in browser tests.

### H. Vote/balance coordination and payout guard — task 6

Change worker `useNextTask` to accept an explicit success callback, called only after the submission response is accepted:

```ts
export function useNextTask(onSubmitted: () => Promise<void>) {
  // Existing task fetching/state stays here.
  // After submitOption succeeds and nextTask state is updated:
  // await onSubmitted();
}
```

The final patch replaces the commented description with the existing full hook implementation and the success call. Keep balance errors handled inside `fetchBalance` so they do not turn a successful vote into a submission error.

Task page obtains balance first, then passes its stable callback:

```tsx
const balance = useBalance();
const tasks = useNextTask(balance.fetchBalance);
```

`BalanceContext.tsx` adds a synchronous guard at the start of payout and releases it in `finally`:

```ts
const payoutInFlight = useRef(false);

// At the beginning of the existing payout callback:
if (payoutInFlight.current || rawPendingLamports <= 0n) return;
payoutInFlight.current = true;

// In its existing finally block:
payoutInFlight.current = false;
setPayingOut(false);
```

Include `rawPendingLamports` in callback dependencies. Separate follow-up tests cover refresh arriving during an in-flight fetch: queue a required refresh or invalidate stale results rather than silently returning and leaving an old balance.

### I. Complete browser example — task 6–7

`apps/tests/frontend/worker/e2e/voting.spec.ts` exercises the UI with the current response shapes:

```ts
import { test, expect } from "@playwright/test";

test("voting refreshes earned balance and finishes the queue", async ({ page }) => {
  let pendingAmount = "0";
  let submissions = 0;
  await page.addInitScript(() => localStorage.setItem("dw_token", "test-worker-token"));
  await page.route("http://127.0.0.1:3999/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/workers/balance") {
      await route.fulfill({ json: { pendingAmount, lockedAmount: "0" } });
      return;
    }
    if (path === "/v1/workers/nextTask") {
      await route.fulfill({ json: { task: {
        id: 7, title: "Choose a thumbnail", amount: "1000000000", user_id: 1,
        options: [
          { id: 11, task_id: 7, image_url: "" },
          { id: 12, task_id: 7, image_url: "" },
        ],
      } } });
      return;
    }
    if (path === "/v1/workers/submission") {
      expect(route.request().postDataJSON()).toEqual({ taskId: 7, optionId: 11 });
      submissions += 1;
      pendingAmount = "10000000";
      await route.fulfill({ json: { submissionId: 42, nextTask: null } });
      return;
    }
    await route.abort();
    throw new Error(`Unexpected backend request: ${path}`);
  });
  await page.goto("/task");
  await page.getByRole("button", { name: "Select option 11", exact: true }).click();
  await expect(page.getByRole("heading", { name: "All done!" })).toBeVisible();
  await expect(page.getByText("0.0100 SOL", { exact: true }).first()).toBeVisible();
  expect(submissions).toBe(1);
});
```

Add `aria-label={`Select option ${option.id}`}` to each task option button. The blank image URLs intentionally use the existing fallback; separate image fixtures test actual rendering. The test above must fail before balance-refresh implementation and pass afterward. Extend the shared browser fixture to enforce request methods, auth headers, all external-host isolation, and error collection across the full suite.

### J. Verification and review records — every task

Run commands for only the selected frontend(s):

```sh
npm run lint -w user-frontend
npm run typecheck -w user-frontend
npm run test:frontend:user -w tests
npm run build -w user-frontend
npm run test:e2e:user -w tests

npm run lint -w workers-frontend
npm run typecheck -w workers-frontend
npm run test:frontend:worker -w tests
npm run build -w workers-frontend
npm run test:e2e:worker -w tests
```

Do not claim these new scripts already exist or pass. Each review record will contain:

```text
Task:
Files changed:
Behavior changed:
Code diff blocks:
Failing-test evidence:
Passing checks:
Manual checks, if performed:
Known limitations:
```

## Next review

Proposed first implementation is **task 1 only**. No application changes have been made in this planning update. Review the frontend-only scope, UI testing strategy, code-change section, and proposed upload limits before implementation.
