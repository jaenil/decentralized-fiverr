# Decentralized Fiverr — thumbnail voting

A prototype marketplace where customers upload thumbnail options and workers vote for their preferred image. Customers view vote totals; workers accrue a database balance. Built with Next.js, Express, PostgreSQL, Prisma ORM and Solana wallet message signing.

**Payments are unfinished:** task funding is not verified and payouts do not send SOL. Customer signatures are verified, but login challenges are not yet single-use. Worker login currently accepts an address without proof of ownership.

## Project layout

| Workspace               | Purpose                                           | Development port                           |
| ----------------------- | ------------------------------------------------- | ------------------------------------------ |
| `apps/backend`          | HTTP API and PostgreSQL contract                  | 3000                                       |
| `apps/user-frontend`    | Customer wallet login, uploads and results        | 3001                                       |
| `apps/workers-frontend` | Worker login, voting and balances                 | 3002                                       |
| `apps/tests`            | Backend HTTP and frontend component/browser tests | Temporary ports for isolated backend tests |
| `packages/types`        | Shared API types                                  | —                                          |
| `apps/docs`             | Unused starter documentation app                  | 3001 (conflicts with customer app)         |

## Local setup

Use Node.js 24 or newer, npm 11.17.0, and PostgreSQL 15 or newer.

```sh
npm ci --legacy-peer-deps --ignore-scripts
cp apps/backend/.env.example apps/backend/.env
cp apps/user-frontend/.env.example apps/user-frontend/.env.local
cp apps/workers-frontend/.env.example apps/workers-frontend/.env.local
```

Edit the backend environment with a **development** database URL, separate nonempty `JWT_SECRET` and `WORKER_JWT_SECRET`, and `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. Do not overwrite existing local environment files if you have already configured them. The current upload bucket is hardcoded as `decentralized-fiverr-jp` in `apps/backend/src/routers/users.ts`.

Initialize a fresh development database from the current contract:

```sh
cd apps/backend
npx prisma db init
cd ../..
```

This applies database changes to the configured `DATABASE_URL`. The historical initial migration does not represent the entire current contract; see [backend setup](apps/backend/README.md).

Start each application in its own terminal:

```sh
npm run dev -w backend
npm run dev -w user-frontend
npm run dev -w workers-frontend
```

The existing backend dev script requires `tsx`, which is not currently declared in its manifest. If it is unavailable, install it with `npm install --save-dev tsx -w backend` before using that script. Avoid root `npm run dev` while the starter docs app still shares port 3001.

Frontend API URLs default to `http://localhost:3000`. Uploads additionally need S3 PUT CORS for the customer origin, suitable IAM permissions, and readable image URLs through S3 or your configured CloudFront distribution. See the frontend `.env.example` files and image host allowlists when using your own distribution.

## Manual task creation without a transaction signature

For **local prototype testing**, enter `manual-test-001` in the task's transaction signature field. No SOL transfer is required: the UI requires nonempty text and the backend currently stores it without checking the blockchain. This is a placeholder, not proof of funding. Wallet login signs a separate message; do not paste a private key, seed phrase, or login signature into this field.

1. Open `http://localhost:3001`, connect Phantom, and approve the sign-in message.
2. Choose **Create task**, add an optional title, enter `manual-test-001`, and select 2–10 PNG/JPEG/WebP images, each no larger than 5 MiB.
3. Submit and keep the resulting task ID. A failed S3 upload must be fixed before task creation can complete.
4. Open `http://localhost:3002`, sign in with a test worker address, and vote. The confirmation shows the task ID and selected option; click **Go to next task** when ready. Existing older tasks may appear first.
5. Refresh the customer's results page and check vote totals. The worker currently earns 0.01 SOL in database units per accepted vote; this is not a funded on-chain balance.
6. If you test payout, expect **initiated** and funds moved to the locked balance. No actual transfer or completion is implemented.

## Automated checks

Backend HTTP tests can provision and clean up their own database and run the actual routers on a temporary loopback port:

```sh
# Requires initdb and pg_ctl on PATH; run as a non-root user.
npm run test:backend:isolated -w tests

# Homebrew PostgreSQL 16 example:
PG_BIN=/opt/homebrew/opt/postgresql@16/bin npm run test:backend:isolated -w tests
```

This uses generated test wallets, separate temporary JWT secrets, and fake AWS signing credentials. It does not use your configured database, contact Solana, or upload to S3. Tests include real database rollback and duplicate-vote concurrency checks. Explicit TODO cases describe safeguards that are not implemented; passing characterization tests do not mean payments or replay protection work.

```sh
npm run test:frontend:user -w tests
npm run test:frontend:worker -w tests
npm run typecheck -w user-frontend
npm run typecheck -w workers-frontend
npm run lint -w user-frontend
npm run lint -w workers-frontend
npm exec -w tests -- playwright install chromium firefox webkit
npm run test:e2e:user -w tests
npm run test:e2e:worker -w tests
```

Use the explicit frontend typecheck scripts: the root `check-types` task currently uses a different script name. See [the testing guide](apps/tests/README.md) for tests against an existing backend and isolation limits.

## Remaining backend work

- Worker wallet ownership verification and expiring, single-use customer login challenges.
- Funding verification, payment reuse prevention, reward budgets and task completion.
- Atomic concurrent balance changes and transaction-consistent next-task selection.
- Actual payout submission, confirmation, retries and reconciliation.
- Server-side upload constraints, unique object keys and abandoned upload cleanup.

The [frontend implementation log](docs/superpowers/plans/2026-10-16-implementation-log.md) describes completed UI work; it does not mark these backend features complete.
