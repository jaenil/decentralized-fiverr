# Backend

Express API mounted at `/v1/users` and `/v1/workers`, listening on port 3000. PostgreSQL schema and emitted Prisma ORM contract live under `src/prisma/`.

## Development setup

From the repository root, install dependencies as described in the [project README](../../README.md). Copy `.env.example` to `.env` only if you do not already have local configuration. Set:

- `DATABASE_URL`: a dedicated development PostgreSQL database (15+).
- `JWT_SECRET` and `WORKER_JWT_SECRET`: separate, nonempty secrets.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`: credentials/region for uploads.

The upload bucket is hardcoded in `src/routers/users.ts`. Configure its CORS and read access/CDN for the customer frontend.

For a fresh database, from `apps/backend`:

```sh
npx prisma db init
```

This initializes the database from the emitted contract. After editing `src/prisma/contract.prisma`, run `npm run contract:emit`; review and plan database changes before applying them to existing data. The checked-in initial migration predates the current contract, so it alone is not a complete fresh setup.

## Existing commands

From the repository root:

```sh
npm run dev -w backend          # tsx src/index.ts
npm run dev:watch -w backend    # tsx watch src/index.ts
npm run build -w backend       # TypeScript compilation
npm run start -w backend       # node dist/index.js
npm run contract:emit -w backend
npm run test:backend:isolated -w tests
```

The development scripts require `tsx`, currently missing from this workspace's declared dependencies. If needed, install it with `npm install --save-dev tsx -w backend`. Production build/start compatibility remains separate from the HTTP test runner, which imports the actual routers through Vitest. There are no `db:init`, `db:update`, `db:seed`, `migration:plan`, or `migrate` npm scripts in the current manifest. `npm test -w backend` is a scaffold placeholder; tests live in `apps/tests`.

## Current API limitations

Customer signup requires `{ address, nonce, signature, name? }`; sign the exact nonce returned by `GET /v1/users/nonce` with the wallet and encode the signature in base58. Nonce expiry and replay prevention are not implemented. Worker signup still accepts `{ walletId }` without signing.

Task creation requires at least two options and a signature string, but does not verify payment. Use `manual-test-001` for local prototype testing; no SOL transfer is necessary. Payout only moves the recorded balance into locked funds and returns a placeholder transaction ID. It does not send SOL.

See [test instructions and known gaps](../tests/README.md).
