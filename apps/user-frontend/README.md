# Customer frontend

Next.js portal for thumbnail voting. Application routes use the existing backend API without changes to its authentication or payment behavior.

## Local development

From the repository root, install dependencies with `npm ci --legacy-peer-deps --ignore-scripts`, copy this app's `.env.example` to `.env.local`, then run:

```sh
npm run dev -w user-frontend
```

Open http://localhost:3001. The API URL defaults to http://localhost:3000. Customer sign-in uses a connected wallet and the server's current nonce flow; worker sign-in still uses a manually supplied address. The customer stores `df_token` and its bound `df_address`; the worker stores `dw_token`. Old customer tokens without an address binding require a new login.

## Checks

```sh
npm run lint -w user-frontend
npm run typecheck -w user-frontend
npm run build -w user-frontend
npm run test:frontend:user -w tests
npm run test:e2e:user -w tests
```

All tests, fixtures, and runner configuration live in `apps/tests`; see [the testing guide](../tests/README.md). ESLint's launcher resolves this app's TypeScript 5 compiler so the hoisted parser does not consume the incompatible root TypeScript 7 API. Root/backend tooling is unchanged.

Customer uploads accept 2–10 PNG/JPEG/WebP files, each at most 5 MiB. These are client checks; backend validation and timestamp-based object-key collisions remain outside scope. Results derive counts from the API's raw submissions. Worker withdrawal messages describe initiation only: the current backend does not complete real on-chain payouts.
