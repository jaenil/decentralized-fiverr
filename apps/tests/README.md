# Application tests

All automated tests live in this workspace. Frontend tests are isolated from the existing backend HTTP suites.

```text
backend/                  Existing HTTP suites and helpers
frontend/user/            Customer component and browser tests
frontend/worker/          Worker component and browser tests
frontend/shared/          Browser isolation, wallet fixture, component setup
```

From the repository root, with Node >=24 (24 LTS recommended) and npm 11.17.0:

```sh
npm ci --legacy-peer-deps --ignore-scripts
npm exec -w tests -- playwright install chromium firefox webkit
npm run test:frontend:user -w tests
npm run test:frontend:worker -w tests
npm run typecheck:frontend -w tests
npm run test:e2e:user -w tests
npm run test:e2e:worker -w tests
```

The legacy-peer option accommodates the existing root wallet bundle's older peer dependencies; this frontend work does not upgrade that unrelated bundle. `--ignore-scripts` prevents the backend's installation hook from running during frontend setup. Install browser system libraries with `playwright install --with-deps` on Linux CI.

Component tests use jsdom and import real app components through portal-specific `@/` aliases. Browser tests launch the customer on 3001 or worker on 3002. Tests deliberately do not reuse manually running servers. Stop the app on the selected port, or use `WORKER_E2E_PORT=3102 npm run test:e2e:worker -w tests` for a separate worker server with `.next/e2e` build output. Run one suite per app at a time. To run only desktop Chromium, append `-- --project=chromium`; mobile is a narrow Chromium viewport, not a real mobile wallet extension.

The network fixture fails unexpected external requests. Known Wallet Adapter font CSS is stubbed; Next image responses use a tiny PNG. API, S3, and Wallet Standard behavior are simulated. No backend process, PostgreSQL database, AWS account, real wallet, or SOL is used. A successful suite verifies UI behavior against these contracts, not real signature verification, funding, payouts, storage permissions, or server concurrency.

Failed browser tests save traces, screenshots, and video under `test-results/`; HTML reports live under `playwright-report/`. Both are ignored by git. Use `npm exec -w tests -- playwright show-trace <trace.zip>` to inspect a failure.

## Backend suites

The customer fixtures generate ephemeral Ed25519 keypairs, fetch the server nonce, sign its exact bytes, and send `{ address, nonce, signature, name }`. No real wallet credentials are needed. Worker fixtures preserve the current address-only API.

### Isolated PostgreSQL run (recommended)

Install PostgreSQL 15+ and put `initdb` and `pg_ctl` on PATH, or set `PG_BIN` to their directory. Run as a non-root user:

```sh
npm run test:backend:isolated -w tests
# macOS/Homebrew example:
PG_BIN=/opt/homebrew/opt/postgresql@16/bin npm run test:backend:isolated -w tests
```

The runner creates a temporary PostgreSQL cluster, initializes the current emitted contract, and starts the real Express routers on an ephemeral loopback port. It overrides database/JWT/AWS variables with disposable values, then closes the server/database pool and stops/removes PostgreSQL after success or failure. It needs local process/socket permissions. The test cluster uses trust authentication on loopback; use it only on a trusted development machine. An abrupt kill may require manual cleanup of the printed temporary directory/process.

S3 presigning uses fake credentials locally; no upload or RPC request occurs. The test server mirrors JSON handling and mounts the production routers/middleware, but does not exercise `src/index.ts` startup, CORS, deployment, or the compiled production bundle.

Coverage includes signed signup, missing/malformed/mismatched signatures, authorization, task creation/results, voting/balances, concurrent duplicate submissions, and payout database rollback/retry using a temporary PostgreSQL trigger. That trigger test only runs with the isolated runner. It proves recovery before a transfer exists, not blockchain reconciliation.

`regressions.test.ts` labels current unsafe behavior explicitly: signed payload replay, unfunded/reused payment strings, and payouts remaining locked with a placeholder signature. Five `it.todo` cases track nonce policy, funding verification, deterministic concurrent credits across different tasks, payout confirmation, and on-chain failure recovery. These are not passing acceptance tests for unfinished features.

### Existing test backend

Set `API_URL` in `apps/tests/.env` to a dedicated disposable test API (default `http://localhost:3000/v1`). That API must use a test database and distinct customer/worker JWT secrets.

```sh
npm exec -w tests -- vitest list --config backend/vitest.config.ts
npm run test:backend -w tests
```

Listing discovers tests without making requests. Running creates records and changes payout balances; it does not clean up a separately managed database. The payout fault-injection test is skipped here. Existing scenarios run sequentially and some depend on earlier setup; run whole suites rather than selecting individual stateful cases.

For manual task creation, a placeholder such as `manual-test-001` works with the current backend. See the [project walkthrough](../../README.md#manual-task-creation-without-a-transaction-signature).
