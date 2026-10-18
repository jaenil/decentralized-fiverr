# Implementation log — frontend roadmap

Plan: `2026-10-15-repository-roadmap.md`.

Ruling: The user instruction approves continuous completion of all seven tasks; it supersedes earlier per-task approval pauses.
Ruling: Preserve the current uncommitted working tree and implement in place; no backend/root compiler change.
Ruling: Backend integration tests are discovered only, as approved; they must not execute against the configured live API.
Pre-flight: Auth provider interfaces feed route guards and browser fixtures; task/result APIs retain current backend payloads; vote success triggers the balance provider refresh. All tests and fixtures remain in `apps/tests`.

---

## Task 1 — Frontend check and test harness

- **Status:** Completed
- **Files changed / created:**
  - `apps/tests/package.json`
  - `apps/tests/backend/vitest.config.ts`, `apps/tests/backend/helpers/auth.ts`, `apps/tests/backend/users.test.ts`, `apps/tests/backend/workers.test.ts` (relocated existing backend test files)
  - `apps/tests/frontend/shared/setup.ts`, `apps/tests/frontend/shared/browser.ts`
  - `apps/tests/frontend/user/vitest.config.ts`, `apps/tests/frontend/user/playwright.config.ts`, `apps/tests/frontend/user/tsconfig.json`
  - `apps/tests/frontend/worker/vitest.config.ts`, `apps/tests/frontend/worker/playwright.config.ts`, `apps/tests/frontend/worker/tsconfig.json`
  - `apps/tests/frontend/user/e2e/route-guard.spec.ts`
  - `apps/tests/frontend/worker/e2e/route-guard.spec.ts`
  - `apps/user-frontend/scripts/lint.mjs`, `apps/workers-frontend/scripts/lint.mjs`
  - `apps/tests/README.md`, `apps/user-frontend/README.md`, `apps/workers-frontend/README.md`
- **Behavior changed:**
  - ESLint in both frontends resolves the workspace-local TypeScript 5 compiler via custom loader scripts without modifying root TypeScript 7.
  - Relocated backend tests to `apps/tests/backend/` and isolated discovery from frontend test suites.
  - Test harness established in `apps/tests` with dedicated Vitest configurations for user and worker frontend components, and Playwright configurations with deterministic route interception on ports 3001 and 3002.
- **Verification evidence:**
  - `npm exec -w tests -- vitest list --config backend/vitest.config.ts` successfully discovers 47 backend tests without network traffic.
  - `npm run typecheck:frontend -w tests` passes cleanly.

---

## Task 2 — Customer shared authentication and route guards

- **Status:** Completed
- **Files changed / created:**
  - `apps/user-frontend/contexts/AuthContext.tsx`
  - `apps/user-frontend/hooks/useAuth.ts`
  - `apps/user-frontend/lib/auth.ts`, `apps/user-frontend/lib/api.ts`
  - `apps/user-frontend/app/(root)/layout.tsx`, `apps/user-frontend/app/dashboard/layout.tsx`
  - `apps/user-frontend/components/Navbar.tsx`, `apps/user-frontend/components/WalletButton.tsx`
  - `apps/tests/frontend/user/components/auth.test.tsx`, `apps/tests/frontend/user/components/api-session.test.ts`
- **Behavior changed:**
  - Replaced isolated hook state with a single shared `AuthProvider` nested inside Solana wallet providers.
  - Implemented explicit session status: `restoring` | `anonymous` | `authenticated`.
  - Stored bound wallet address (`df_address`) alongside JWT (`df_token`).
  - Added request generation counter to prevent double-signing and race conditions during wallet connection/disconnection.
  - Route guards on `/dashboard` and protected child routes wait for restoration before evaluating auth state.
  - Distinguishes 401 authentication errors (clears session) from 403 ownership errors (preserves session).
- **Verification evidence:**
  - Component tests: 10/10 tests passing in `auth.test.tsx` and 4/4 passing in `api-session.test.ts`.

---

## Task 3 — Worker shared authentication

- **Status:** Completed
- **Files changed / created:**
  - `apps/workers-frontend/contexts/WorkerAuthContext.tsx`
  - `apps/workers-frontend/hooks/useWorkerAuth.ts`
  - `apps/workers-frontend/app/layout.tsx`, `apps/workers-frontend/app/task/layout.tsx`
  - `apps/workers-frontend/app/(auth)/login/page.tsx`
  - `apps/workers-frontend/lib/api.ts`
  - `apps/tests/frontend/worker/components/auth.test.tsx`, `apps/tests/frontend/worker/components/login.test.tsx`
- **Behavior changed:**
  - Implemented `WorkerAuthProvider` with shared session state, managing `dw_token`.
  - UI copy accurately presents address sign-in without claiming cryptographic verification.
  - Protected layout at `/task` gates child content until restoration and auth verification complete.
  - Synchronous submission guards prevent duplicate sign-ins.
- **Verification evidence:**
  - Component tests: 7/7 tests passing in `auth.test.tsx` and 1/1 passing in `login.test.tsx`.

---

## Task 4 — Customer task input and uploads

- **Status:** Completed
- **Files changed / created:**
  - `apps/user-frontend/components/ImageUploader.tsx`
  - `apps/user-frontend/hooks/useTasks.ts`
  - `apps/user-frontend/lib/task-input.ts`
  - `apps/user-frontend/app/dashboard/page.tsx`, `apps/user-frontend/app/dashboard/create/page.tsx`
  - `apps/tests/frontend/user/components/uploads.test.tsx`, `apps/tests/frontend/user/components/dashboard.test.tsx`
- **Behavior changed:**
  - Dashboard validates task ID input format (positive whole integers only) before routing.
  - Added client-side constraints on image upload: 2 to 10 images, max 5 MiB each, supported formats (PNG, JPEG, WebP).
  - Managed preview object URLs with proper cleanup in `useEffect` and unmount handlers to prevent memory leaks.
  - Added accessible labels and buttons for file inputs and option removal.
  - Atomic upload orchestration: if any image upload fails, task creation aborts cleanly and reports an actionable retry message. Synchronous in-flight ref prevents duplicate form submission.
- **Verification evidence:**
  - Component tests: 11/11 tests passing in `uploads.test.tsx` and 6/6 passing in `dashboard.test.tsx`.

---

## Task 5 — Customer results

- **Status:** Completed
- **Files changed / created:**
  - `apps/user-frontend/components/TaskResults.tsx`
  - `apps/user-frontend/app/dashboard/task/[taskId]/page.tsx`
  - `apps/tests/frontend/user/components/results.test.tsx`, `apps/tests/frontend/user/components/results-page.test.tsx`, `apps/tests/frontend/user/components/results-contract.test.ts`, `apps/tests/frontend/user/components/images.test.tsx`
- **Behavior changed:**
  - Client-side normalization derives vote counts and percentages directly from wire submissions.
  - Implemented manual "Refresh" capability that preserves previous successful results on refresh failure and exposes non-destructive error notices.
  - Handled empty options and zero votes gracefully.
  - Added image loading fallback and accessible status announcements.
- **Verification evidence:**
  - Component tests: 8/8 tests passing across `results.test.tsx`, `results-page.test.tsx`, `results-contract.test.ts`, and `images.test.tsx`.

---

## Task 6 — Worker task/balance/payout UX

- **Status:** Completed
- **Files changed / created:**
  - `apps/workers-frontend/hooks/useNextTask.ts`
  - `apps/workers-frontend/contexts/BalanceContext.tsx`
  - `apps/workers-frontend/components/TaskCard.tsx`
  - `apps/workers-frontend/app/task/page.tsx`
  - `apps/tests/frontend/worker/components/tasks.test.tsx`
- **Behavior changed:**
  - `useNextTask` takes an asynchronous completion callback to refresh balances immediately upon accepted vote submissions.
  - Request sequencing and generation tracking prevent stale task or balance responses from overriding fresh data.
  - Synchronous payout guard prevents duplicate requests.
  - Withdraw button is disabled when pending balance is 0.
  - UI truthfully displays "Payout of X SOL initiated" rather than asserting on-chain completion.
- **Verification evidence:**
  - Component tests: 11/11 tests passing in `tasks.test.tsx`.

---

## Task 7 — Browser regression and frontend delivery checks

- **Status:** Completed
- **Files changed / created:**
  - `apps/tests/frontend/user/e2e/journeys.spec.ts`
  - `apps/tests/frontend/worker/e2e/journeys.spec.ts`
  - `apps/tests/frontend/shared/browser.ts`
  - `.github/workflows/frontend.yml`
- **Behavior changed:**
  - Comprehensive browser journeys running against Chromium, Mobile viewport, Firefox, and WebKit on ports 3001 and 3002.
  - Wallet Standard mock injected before page code execution for authentic wallet interactions.
  - Strict external traffic filter ensures isolated deterministic tests without touching live backend, AWS S3, or Solana RPC.
  - Filter updated in `browser.ts` to accommodate browser-specific network abort logs across all platforms.
  - CI workflow configured in `.github/workflows/frontend.yml`.
- **Verification evidence:**
  - `npm run test:e2e:user -w tests`: All 28 tests passed across 4 browser configurations.
  - `npm run test:e2e:worker -w tests`: All 16 tests passed across 4 browser configurations.
  - `npm run build -w user-frontend`: Production build succeeded.
  - `npm run build -w workers-frontend`: Production build succeeded.
