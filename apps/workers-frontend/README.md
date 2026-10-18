# Worker frontend

Next.js portal for thumbnail voting. Application routes use the existing backend API without changes to its authentication or payment behavior.

## Local development

From the repository root, install dependencies with `npm ci --legacy-peer-deps --ignore-scripts`, copy this app's `.env.example` to `.env.local`, then run:

```sh
npm run dev -w workers-frontend
```

Open http://localhost:3002. The API URL defaults to http://localhost:3000. Customer sign-in uses a connected wallet and the server's current nonce flow; worker sign-in still uses a manually supplied address. The customer stores `df_token` and its bound `df_address`; the worker stores `dw_token`. Old customer tokens without an address binding require a new login.

## Checks

```sh
npm run lint -w workers-frontend
npm run typecheck -w workers-frontend
npm run build -w workers-frontend
npm run test:frontend:worker -w tests
npm run test:e2e:worker -w tests
```

All tests, fixtures, and runner configuration live in `apps/tests`; see [the testing guide](../tests/README.md). ESLint's launcher resolves this app's TypeScript 5 compiler so the hoisted parser does not consume the incompatible root TypeScript 7 API. Root/backend tooling is unchanged.

Customer uploads accept 2–10 PNG/JPEG/WebP files, each at most 5 MiB. These are client checks; backend validation and timestamp-based object-key collisions remain outside scope. Results derive counts from the API's raw submissions. Worker withdrawal messages describe initiation only: the current backend does not complete real on-chain payouts.

## Voting and image display

After a successful vote, `/task` shows a confirmation with the task title, task ID, selected option ID and image. **Go to next task** makes a fresh `GET /v1/workers/nextTask` request. A failed next-task request keeps the confirmation available for retry; a balance refresh does not block progression. The legacy `nextTask` returned by submission is ignored. Confirmation is local page state and is not persisted across reloads.

Stored URLs from `decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com` are displayed through `NEXT_PUBLIC_CDN_HOSTNAME`, matching the configured CloudFront distribution. Direct access to this bucket can return 403 even when the same key is readable through CloudFront. Unsupported hosts and failed image requests display **Image unavailable**. The app does not make private S3 objects public or turn placeholder URLs into real images.

To run browser tests while developing on port 3002:

```sh
WORKER_E2E_PORT=3102 npm run test:e2e:worker -w tests
```

Browser tests use separate `.next/e2e` output and controlled API/image responses. They verify UI behavior, not AWS permissions or production backend funding/payouts.
