# Solana Wallet Connection & Backend Authentication — Development Implementation Plan

## Open questions and approach issues

**Open questions (the plan uses the defaults below; none blocks this document):**

1. **What does “hardcoded” mean for the timestamp?** Default: use the fixed string `Sign in to application decentralized fiverr at 1728123456789`, using the example timestamp from your draft. Do not execute `Date.now()` on the frontend or backend. If you want the literal characters `${Date.now()}` instead, change only the backend constant; the protocol is unchanged. Generating a timestamp on every request is a different approach from a fixed message.
2. **Which portals?** Default: apply the same development flow to users and workers, preserving separate records, routes, JWT secrets, and localStorage keys. The user code is shown first; exact worker substitutions are listed below.
3. **What should disconnect do?** Default: an observed connected → disconnected transition clears local login state; switching to another address also clears it. A page refresh must not clear a saved token merely because autoConnect has not completed yet.
4. **Session lifetime?** Default: retain your draft’s seven-day JWT for local development. Logout clears the browser copy; it does not revoke an already copied token.

**Issues to flag before implementation:**

- **Fixed-message replay is deliberately allowed.** Someone holding a valid message signature and its public address can obtain another JWT without a fresh Phantom approval. This proves that the signature was created by that wallet at some point, not that the current requester controls it now. The `/nonce` endpoint preserves the API shape; by itself it does not add freshness or replay protection.
- **The pasted plan’s layout assumption is incorrect for the current routes.** `app/(root)/layout.tsx` exists, but `/login` lives under `(auth)` and the dashboard lives under `app/dashboard`. Neither is a descendant of `(root)`. Put the provider in `app/layout.tsx` and remove the duplicate provider from `(root)`.
- **`wallets={[]}` is not a bug.** Current Wallet Adapter discovers Wallet Standard wallets, including supported Phantom installations. The official [Solana React guide](https://solana.com/developers/cookbook/wallets/connect-wallet-react) uses this configuration. Avoid the large legacy `wallet-adapter-wallets` bundle unless a particular legacy wallet needs it.
- **A timestamp is neither guaranteed unique nor unpredictable.** Your draft’s `Date.now()` claims need correction. Even checking timestamp age would not stop replay within the allowed window; production needs a server-issued, single-use challenge.
- **One auth hook instance per component is not shared session state.** A navbar and login page using independent `useState` hooks can disagree. The revised hook uses one AuthProvider, and disconnect detection distinguishes transitions from the initial disconnected state.
- **Devnet is unrelated to message verification.** No RPC call or SOL balance is required for login. Do not blindly accept wallet warnings or treat selecting devnet as an authentication safeguard.
- **The existing address-only signup routes must be replaced.** Adding a signature-enabled route while retaining an unsigned login path leaves the bypass open. Existing unsigned-login JWTs should be invalidated once by changing the local development secrets.
- **Do not log authentication signatures or paste live JWTs into external decoder sites.** A fixed-message signature is reusable login material. Inspect harmless status information locally instead.

**Scope:** Complete a local development wallet connection and signed-login flow, including code examples. No application implementation is performed by updating this plan. No Redis, random nonce storage, expiry tracking, or one-time consumption is required for this development version. Payments and payouts remain separate work.

## Part 1 — Background theory

### 1.1 Wallet keys and identity

Phantom manages a private key. Your application reads the corresponding public key and requests signatures without seeing the private key or seed phrase. For a normal Solana signing wallet, the displayed address is the base58 encoding of its 32-byte public key; the extra “public key → hash → address” step in the original draft does not describe this Solana address format.

```text
Private key → public key → base58-encoded Solana address
    secret      public               public
```

Connection gives your application an address and access to signing requests. It does not establish a backend login. A verified message signature proves the signing key authorized those exact message bytes. It does not prove a person’s legal identity or that one person has only one wallet.

### 1.2 Transactions versus authentication messages

A Solana transaction contains instructions, a recent blockhash, a fee payer, and the required signatures. Instructions describe actions such as transferring SOL or calling a program. Required signers depend on the instructions, not only on the fee payer. A recent blockhash limits transaction validity; it is not the login challenge used here.

```text
Build instructions → wallet approval and signing → submit through RPC
                   → check confirmation and execution errors
```

A returned transaction signature identifies a submission; it is not itself proof of successful execution. Instructions within a transaction execute atomically: failure reverts state changes, although fees can still be charged. Fees vary with the signatures and prioritization settings; avoid presenting one approximate fee as universal. See [Solana transactions](https://solana.com/docs/core/transactions).

A login message is arbitrary UTF-8 text signed with Ed25519. The backend verifies it locally. There is no on-chain submission, transaction confirmation, or SOL fee. See [Phantom message signing](https://docs.phantom.com/solana/signing-a-message).

### 1.3 The selected development flow

```text
Browser                                  Express
Connect Phantom
GET /v1/users/nonce                →      Return fixed backend message
                                  ←      { nonce: "Sign in ... at 1728123456789" }
Phantom signs those exact UTF-8 bytes
POST /v1/users/signup              →      Reject a different message
 { address, nonce, signature, name }      Verify signature against backend constant
                                         Upsert User; issue JWT
                                  ←      { token, address }
Save JWT; use Authorization: Bearer ...
```

Workers use `/v1/workers/nonce` and `/v1/workers/signup`. The backend does not trust arbitrary client-supplied text: it requires `nonce` to equal its fixed constant and verifies the signature over that constant. There is no assertion that the endpoint was fetched before signup—this is intentionally stateless development authentication.

## Part 2 — File map and installation

| File | Responsibility |
|---|---|
| `apps/backend/src/auth/devWalletAuth.ts` | Fixed message, decoding, verification, shared auth routes |
| `apps/backend/src/routers/users.ts` | Mount user auth; retain user business routes |
| `apps/backend/src/routers/workers.ts` | Mount worker auth; retain worker business routes |
| `apps/backend/src/index.ts` | Load environment first; origins, body limit, error handler |
| `packages/types/src/index.ts` | Shared wire types |
| Both frontends: `components/SolanaProvider.tsx` | Wallet context |
| Both frontends: `app/layout.tsx` | Wrap all routes with wallet and auth providers |
| User: `app/(root)/layout.tsx` | Remove duplicate wallet context |
| Both frontends: `lib/api.ts`, `lib/auth.ts` | Signed API calls and session storage |
| User: `hooks/useAuth.ts`; worker: `hooks/useWorkerAuth.ts` | Shared session state, signing, disconnect and account switch handling |
| Both frontends: `app/(auth)/login/page.tsx` | Connect and sign buttons |
| User: `app/dashboard/layout.tsx`; worker: `app/task/layout.tsx` | Reactive session guard |
| `apps/tests/dev-wallet-auth.test.ts` | Signature and regression checks |

### Step 1 — Install only required packages

From the repository root:

```bash
npm install -w user-frontend @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui bs58
npm install -w workers-frontend @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui bs58
npm install -w backend @solana/web3.js tweetnacl bs58
npm install -D -w tests tweetnacl bs58
```

`@solana/web3.js` supplies PublicKey and RPC utilities. Wallet Adapter supplies React wallet discovery, state, and controls. `tweetnacl` verifies Ed25519 signatures. `bs58` transports byte signatures as JSON strings. Current bs58 releases provide TypeScript declarations; do not add `@types/bs58` by default. Check installed package compatibility during implementation; this document has not installed or compiled these snippets.

### Step 2 — Set local environment and ports

Backend: retain existing database/AWS settings and configure:

```dotenv
NODE_ENV=development
PORT=3000
USER_ORIGIN=http://localhost:3001
WORKER_ORIGIN=http://localhost:3002
```

Generate different local secrets with `openssl rand -hex 32`; set `JWT_SECRET` and `WORKER_JWT_SECRET`. Remove fallback secrets. Changing these invalidates old unsigned-login tokens.

Both frontend `.env.local` files:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Start each workspace from separate terminals at the repository root:

```bash
npm run dev:watch -w backend
npm run dev -w user-frontend -- -p 3001
npm run dev -w workers-frontend
```

The workers script already selects port 3002. Express currently uses 3000, so the user frontend must not use its default port 3000.

## Part 3 — Providers and connection

### Step 3 — Create the wallet provider in each frontend

`components/SolanaProvider.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

export default function SolanaProvider({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    ?? "https://api.devnet.solana.com";
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

`autoConnect` attempts to restore the wallet connection. A restored wallet connection and a restored JWT are independent states.

### Step 4 — Wrap all routes, not only `(root)`

Keep each existing root layout as a Server Component so metadata and fonts still work. Add imports to `app/layout.tsx`:

```tsx
import SolanaProvider from "@/components/SolanaProvider";
import { AuthProvider } from "@/hooks/useAuth";
import "@solana/wallet-adapter-react-ui/styles.css";
```

Replace only the children inside the existing body:

```tsx
<SolanaProvider>
  <AuthProvider>{children}</AuthProvider>
</SolanaProvider>
```

For workers import `WorkerAuthProvider` from `@/hooks/useWorkerAuth` and use it in place of AuthProvider. Preserve the worker body classes and font configuration.

Replace the user’s `app/(root)/layout.tsx` contents with a pass-through layout so it cannot create a second wallet context:

```tsx
import type { ReactNode } from "react";
export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}
```

## Part 4 — Backend nonce endpoint and signature verification

### Step 5 — Define wire types

Add to `packages/types/src/index.ts`:

```ts
export interface NonceResponse { nonce: string }
export interface SignedSignupRequest {
  address: string;
  nonce: string;
  signature: string;
  name?: string;
}
export interface SignedAuthResponse extends AuthResponse { address: string }
```

Keep `AuthResponse { token: string }` for existing consumers. A message signature is not an on-chain transaction ID even though both can be encoded in base58.

### Step 6 — Keep a backend `/nonce` endpoint with a fixed value

Create `apps/backend/src/auth/devWalletAuth.ts`:

```ts
import { Router } from "express";
import type { RequestHandler } from "express";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";

export const DEV_NONCE =
  "Sign in to application decentralized fiverr at 1728123456789";

type Options = {
  role: "user" | "worker";
  secret: string;
  upsert: (address: string, name: string | undefined) => Promise<number>;
};

export function devWalletAuthRouter({ role, secret, upsert }: Options) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Fixed-message wallet auth is development only");
  }
  if (secret.length < 32) throw new Error("JWT secret must be at least 32 characters");
  const router = Router();
  const noStore: RequestHandler = (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  };
  router.get("/nonce", noStore, (_req, res) => {
    res.json({ nonce: DEV_NONCE });
  });
  router.post("/signup", noStore, async (req, res) => {
    const { address, nonce, signature, name } = req.body ?? {};
    if (typeof address !== "string" || address.length > 44
      || typeof nonce !== "string" || nonce !== DEV_NONCE
      || typeof signature !== "string" || signature.length > 100
      || (name !== undefined && (typeof name !== "string" || name.length > 100))) {
      res.status(400).json({ message: "Invalid signed signup request" });
      return;
    }
    let canonicalAddress: string;
    try {
      const publicKey = new PublicKey(address);
      canonicalAddress = publicKey.toBase58();
      const signatureBytes = bs58.decode(signature);
      if (signatureBytes.length !== 64 || !nacl.sign.detached.verify(
        new TextEncoder().encode(DEV_NONCE),
        signatureBytes,
        publicKey.toBytes(),
      )) {
        res.status(401).json({ message: "Invalid wallet signature" });
        return;
      }
    } catch {
      res.status(401).json({ message: "Malformed address or signature" });
      return;
    }
    const id = await upsert(canonicalAddress, name);
    const token = jwt.sign({ id, address: canonicalAddress, role }, secret, {
      algorithm: "HS256", expiresIn: "7d",
    });
    res.json({ token, address: canonicalAddress });
  });
  return router;
}
```

This is the requested Step 6 change: `GET /v1/users/nonce` returns the backend constant. The frontend fetches it and signs it. `POST /signup` rejects different text and verifies using `DEV_NONCE`, never arbitrary received text. No address query, per-wallet record, random value, Redis, or expiration is needed for the fixed response.

The development-only startup condition prevents accidentally using this router when NODE_ENV is production. The fixed suffix is a label, not a current timestamp or freshness check. Reusing a valid signature remains accepted by design.

### Step 7 — Replace both existing signup handlers

In `apps/backend/src/routers/users.ts`, import the shared router and remove the entire old address-only signup handler:

```ts
import { devWalletAuthRouter } from "../auth/devWalletAuth";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is required");
router.use(devWalletAuthRouter({
  role: "user", secret,
  upsert: async (address, name) => {
    const profile = name === undefined ? {} : { name };
    const user = await db.orm.public.User.upsert({
      create: { address, ...profile },
      update: profile,
      conflictOn: { address },
    });
    if (!user) throw new Error("User upsert failed");
    return user.id;
  },
}));
```

In `apps/backend/src/routers/workers.ts`, remove the old handler and mount:

```ts
import { devWalletAuthRouter } from "../auth/devWalletAuth";

const secret = process.env.WORKER_JWT_SECRET;
if (!secret) throw new Error("WORKER_JWT_SECRET is required");
router.use(devWalletAuthRouter({
  role: "worker", secret,
  upsert: async (address) => {
    const worker = await db.orm.public.Worker.upsert({
      create: { address }, update: {}, conflictOn: { address },
    });
    if (!worker) throw new Error("Worker upsert failed");
    return worker.id;
  },
}));
```

Retain the existing `db.orm.public` syntax and business routes. Remove now-unused jwt imports from those router files. The same fixed signature can authenticate either portal because the message does not bind a role; this is another known development limitation. JWTs themselves remain separated by the secret and role.

In each auth middleware, constrain `jwt.verify` to `algorithms: ["HS256"]`, require the expected role and a positive integer id, and keep assigning the verified ID rather than trusting a body-provided ID:

```ts
const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
if (typeof decoded === "string" || decoded.role !== "user"
  || !Number.isInteger(decoded.id) || decoded.id <= 0) {
  return res.status(401).json({ message: "Invalid session" });
}
req.body = req.body || {};
req.body.userId = decoded.id;
return next();
```

For workers require `decoded.role === "worker"`, use WORKER_JWT_SECRET and assign `workerId`. Missing, invalid, or expired sessions return 401; authorization failures such as accessing another user’s task remain 403.

In `src/index.ts`, load `dotenv/config` before configuration consumers, replace wildcard CORS and the unrestricted JSON body parser, and retain both existing router mounts:

```ts
import "dotenv/config";
import type { ErrorRequestHandler } from "express";

if (!process.env.JWT_SECRET || !process.env.WORKER_JWT_SECRET
  || process.env.JWT_SECRET === process.env.WORKER_JWT_SECRET
  || !process.env.USER_ORIGIN || !process.env.WORKER_ORIGIN) {
  throw new Error("Distinct JWT secrets and explicit frontend origins are required");
}
app.use(express.json({ limit: "16kb" }));
app.use(cors({ origin: [process.env.USER_ORIGIN, process.env.WORKER_ORIGIN] }));

// Add after the existing router mounts:
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error?.status === 400 ? 400 : error?.status === 413 ? 413 : 500;
  res.status(status).json({ message: status === 500
    ? "Authentication service failed" : "Invalid request body" });
};
app.use(errors);
// Replace the existing listen statement:
app.listen(Number(process.env.PORT ?? 3000));
```

Do not paste a second app.use(express.json), a second router mount, or a second listen into the file. Express 5 forwards async handler errors to the error handler. CORS controls browser access, not identity or replay.

## Part 5 — Frontend signing and shared auth lifecycle

### Step 8 — Update the existing API and storage helpers

In the user’s `lib/api.ts`, retain apiClient and all business API methods; replace address-only signup with:

```ts
import type { NonceResponse, SignedSignupRequest, SignedAuthResponse } from "@repo/types";
export async function getNonce(): Promise<NonceResponse> {
  return (await apiClient.get<NonceResponse>("/v1/users/nonce")).data;
}
export async function signup(body: SignedSignupRequest): Promise<SignedAuthResponse> {
  return (await apiClient.post<SignedAuthResponse>("/v1/users/signup", body)).data;
}
```

Add these exports to the user’s `lib/auth.ts` alongside existing token helpers:

```ts
const ADDRESS_KEY = "df_address";
export function saveAddress(address: string): void {
  localStorage.setItem(ADDRESS_KEY, address);
}
export function loadAddress(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ADDRESS_KEY);
}
export function clearAddress(): void { localStorage.removeItem(ADDRESS_KEY); }
```

The address is UI session metadata, not an authorization source. The backend trusts only verified JWT claims.

### Step 9 — Replace useAuth with one shared provider

The wallet state is available because AuthProvider is nested beneath SolanaProvider. All consumers share the same token, so logout updates the navbar and route guard together.

`apps/user-frontend/hooks/useAuth.ts`:

```tsx
"use client";
import { createContext, createElement, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { getNonce, signup } from "@/lib/api";
import { saveToken, loadToken, clearToken, saveAddress, loadAddress, clearAddress } from "@/lib/auth";

type Auth = {
  token: string | null; address: string | null; ready: boolean;
  isLoggedIn: boolean; loading: boolean; error: string | null;
  login: (name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [token, setToken] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previous = useRef({ connected: false, address: null as string | null });
  const current = useRef({ connected, address: walletAddress });
  current.current = { connected, address: walletAddress };
  const generation = useRef(0);
  const signing = useRef(false);

  const clearSession = useCallback(() => {
    generation.current += 1;
    clearToken(); clearAddress(); setToken(null); setAddress(null);
  }, []);
  useEffect(() => {
    const savedToken = loadToken();
    const savedAddress = loadAddress();
    if (savedToken && savedAddress) {
      setToken(savedToken); setAddress(savedAddress);
    } else { clearToken(); clearAddress(); }
    setReady(true);
  }, []);

  useEffect(() => {
    const prior = previous.current;
    const disconnected = prior.connected && !connected;
    const switched = connected && walletAddress !== null
      && ((prior.address !== null && prior.address !== walletAddress)
        || (address !== null && address !== walletAddress));
    if (disconnected || switched) clearSession();
    previous.current = { connected, address: walletAddress };
  }, [connected, walletAddress, address, clearSession]);

  async function login(name = ""): Promise<boolean> {
    if (!ready || signing.current) return false;
    if (!connected || !publicKey || !signMessage) {
      setError("Connect a wallet that supports message signing first");
      return false;
    }
    const signingAddress = publicKey.toBase58();
    const attempt = generation.current;
    const sameWallet = () => attempt === generation.current
      && current.current.connected && current.current.address === signingAddress;
    signing.current = true; setLoading(true); setError(null);
    try {
      const { nonce } = await getNonce();
      if (!sameWallet()) throw new Error("Wallet changed; sign in again");
      const bytes = await signMessage(new TextEncoder().encode(nonce));
      if (!sameWallet()) throw new Error("Wallet changed; sign in again");
      const session = await signup({
        address: signingAddress, nonce, signature: bs58.encode(bytes), name,
      });
      if (!sameWallet() || session.address !== signingAddress) {
        throw new Error("Wallet changed; sign in again");
      }
      saveAddress(session.address); saveToken(session.token);
      setAddress(session.address); setToken(session.token);
      return true;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Login failed or was cancelled");
      return false;
    } finally { signing.current = false; setLoading(false); }
  }
  async function logout(): Promise<void> {
    clearSession();
    try { await disconnect(); } catch { /* Local logout is already complete. */ }
  }
  const value: Auth = { token, address, ready, isLoggedIn: Boolean(token),
    loading, error, login, logout };
  return createElement(Context.Provider, { value }, children);
}
export function useAuth(): Auth {
  const auth = useContext(Context);
  if (!auth) throw new Error("useAuth requires AuthProvider");
  return auth;
}
```

`createElement` allows this file to retain its existing `.ts` extension. The transition ref prevents initial `connected=false` from logging out a hydrated session. The generation check stops a pending signing request from restoring a session after logout or account change. Add a component test for each of these cases before implementation. A refresh with no wallet connection can retain a valid bearer session until a real disconnect transition, explicit logout, or token expiry—connection and backend authentication remain independent.

Clearing a browser token cannot invalidate a copied JWT. The adapter’s disconnect state may also depend on which Phantom action is taken and when the extension reports it; verify the actual supported disconnect behavior on the installed wallet version.

### Step 10 — Update login page, guard, and navbar

User `app/(auth)/login/page.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/hooks/useAuth";
const WalletButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(m => m.WalletMultiButton),
  { ssr: false },
);
export default function LoginPage() {
  const { connected, signMessage } = useWallet();
  const { login, ready, loading, error } = useAuth();
  const [name, setName] = useState("");
  const router = useRouter();
  async function signIn() {
    if (await login(name.trim())) router.replace("/dashboard");
  }
  return (
    <main>
      <h1>Sign in with Phantom</h1>
      <WalletButton />
      <input aria-label="Display name" value={name} maxLength={100}
        onChange={event => setName(event.target.value)} />
      <button onClick={signIn} disabled={!ready || !connected || !signMessage || loading}>
        {loading ? "Waiting for approval…" : "Sign message to log in"}
      </button>
      {connected && !signMessage && <p>This wallet cannot sign messages.</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
```

Redirect only when login returns true. Do not redirect unconditionally after a hook that catches errors.

Update the dashboard layout’s session guard to use shared auth instead of reading localStorage only once:

```tsx
const { ready, isLoggedIn } = useAuth();
useEffect(() => {
  if (ready && !isLoggedIn) router.replace("/login");
}, [ready, isLoggedIn, router]);
if (!ready || !isLoggedIn) return <p>Checking session…</p>;
```

Keep the existing dashboard JSX below that guard. Replace its old `isLoggedIn` helper import with the hook. In Navbar’s existing logout handler, await logout before redirecting:

```ts
const handleLogout = async () => {
  await logout();
  router.replace("/login");
};
```

The existing Authorization interceptor continues to read `df_token`. Add an expired-session response handler so protected API 401s remove both token and address and reload the login page:

```ts
apiClient.interceptors.response.use(response => response, error => {
  const path = error.config?.url ?? "";
  if (typeof window !== "undefined" && error.response?.status === 401
    && path !== "/v1/users/signup" && path !== "/v1/users/nonce") {
    localStorage.removeItem("df_token");
    localStorage.removeItem("df_address");
    window.location.replace("/login");
  }
  return Promise.reject(error);
});
```

Client route guards are only UI behavior; Express middleware remains the actual access control.

### Step 11 — Apply the same flow to workers

Use the same provider and hook implementation in the workers workspace with these exact substitutions:

| User value | Worker value |
|---|---|
| `hooks/useAuth.ts` | `hooks/useWorkerAuth.ts` |
| `AuthProvider`, `useAuth` | `WorkerAuthProvider`, `useWorkerAuth` |
| `/v1/users/nonce`, `/v1/users/signup` | `/v1/workers/nonce`, `/v1/workers/signup` |
| `signup` API export/import | `workerSignup` API export/import |
| `df_token`, `df_address` | `dw_token`, `dw_address` |
| `/dashboard` redirect | `/task` redirect |
| `app/dashboard/layout.tsx` guard | `app/task/layout.tsx` guard |

Worker login has no display name input and calls login() without a name. Remove old `workerSignup(walletId)` call sites. Preserve all other worker API functions and balance/payout views. Each portal uses its own storage origin and keys.

## Part 6 — Verification and development acceptance

### Step 12 — Backend regression tests

Use the existing Vitest test workspace with a local test backend and a throwaway database. Do not run account-creating tests against production. Start with these tests before changing signup:

```ts
import { it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
const api = process.env.TEST_BACKEND_URL ?? "http://localhost:3000";
async function post(body: unknown) {
  return fetch(`${api}/v1/users/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function signedBody() {
  const wallet = nacl.sign.keyPair();
  const response = await fetch(`${api}/v1/users/nonce`);
  expect(response.status).toBe(200);
  const { nonce } = await response.json();
  return {
    address: bs58.encode(wallet.publicKey), nonce,
    signature: bs58.encode(nacl.sign.detached(
      new TextEncoder().encode(nonce), wallet.secretKey,
    )),
  };
}
it("rejects the address-only bypass", async () => {
  const body = await signedBody();
  expect((await post({ address: body.address })).status).toBe(400);
});
it("accepts a valid signature and returns the verified address", async () => {
  const body = await signedBody();
  const response = await post(body);
  expect(response.status).toBe(200);
  expect((await response.json()).address).toBe(body.address);
});
it("rejects client-chosen message text", async () => {
  const body = await signedBody();
  expect((await post({ ...body, nonce: "some other text" })).status).toBe(400);
});
it("rejects a signature that does not match the backend message", async () => {
  const body = await signedBody();
  expect((await post({ ...body, signature: bs58.encode(new Uint8Array(64)) })).status).toBe(401);
});
it("documents the intentionally replayable development behavior", async () => {
  const body = await signedBody();
  expect((await post(body)).status).toBe(200);
  expect((await post(body)).status).toBe(200);
});
```

Add worker equivalents and cases for invalid base58, wrong signing key, array/object input, missing fields, failed database operations, expired JWT, wrong role, and disabled development mode. A replay test must expect acceptance here, not claim replay protection.

### Step 13 — Frontend and browser checks

- [ ] Connect Phantom: show the actual address, then request a separate message-signing approval.
- [ ] Confirm GET `/nonce` returns the same fixed string each time and signup sends exactly those bytes.
- [ ] Cancel connection and signing separately: no token saved and no dashboard redirect.
- [ ] Double-click login: only one signing flow starts.
- [ ] Refresh while autoConnect is pending: a stored session is not immediately cleared.
- [ ] Disconnect after connecting: clear token/address and reactively return to login.
- [ ] Change account while signing or waiting for signup: the pending request cannot save the old session into the new wallet UI.
- [ ] Explicit logout invalidates an in-flight login locally and updates every auth consumer.
- [ ] Remove/signature-mutate the signup request: the backend rejects it.
- [ ] An expired protected-API token returns 401 and clears local session state.
- [ ] Each portal has wallet context on its login and protected routes; no nested duplicate provider or hydration error.
- [ ] Login works without SOL. Devnet funding is required only for subsequent on-chain tests.

Run:

```bash
npm run test -w tests -- --run dev-wallet-auth.test.ts
npm run build -w backend
npm run lint -w user-frontend
npm run lint -w workers-frontend
npm run build -w user-frontend
npm run build -w workers-frontend
```

Existing tests that depend on unsigned signup need updating to use signed test wallets. No application tests are claimed to pass from this plan-editing task.

## Part 7 — Production changes kept out of this development implementation

| Development choice | Production replacement |
|---|---|
| Fixed backend message and replay accepted | Random server-issued challenge with expiry and atomic one-time consumption |
| Same message for user and worker | Bind expected domain, address, role/purpose, and server-issued nonce |
| Custom message format | Consider standardized Sign In With Solana inputs and verification |
| LocalStorage bearer JWT | Design secure session storage; HttpOnly cookies require coordinated CSRF, CORS, and frontend credential changes |
| Seven-day non-revocable JWT | Define expiry, refresh, revocation, and logout semantics |
| Local-only testing | HTTPS, authentication rate limits, deployment origin allowlist, failure monitoring |

This development endpoint is an easy migration seam: replace its fixed response with a server-issued challenge and replace signup’s constant check with stored-challenge validation. Do not merely check a frontend timestamp. Keep payment verification separate: a signed login message is not proof of task funding or a successful payout.

## Resources

- [Wallet Adapter](https://github.com/anza-xyz/wallet-adapter): library and React integration.
- [Solana React wallet connection](https://solana.com/developers/cookbook/wallets/connect-wallet-react): provider setup and Wallet Standard discovery.
- [Phantom message signing](https://docs.phantom.com/solana/signing-a-message): UTF-8 signing and Ed25519 verification.
- [Solana transactions](https://solana.com/docs/core/transactions): transaction execution model.
- [Sign In With Solana](https://github.com/phantom/sign-in-with-solana): future standardized authentication.
- [Your supplied tutorial](https://palmartin.medium.com/connect-any-website-to-solana-wallet-in-5-minutes-2025-edition-for-complete-beginners-fdd205f33f8e): connection walkthrough; adapted here to the actual Next.js route hierarchy.
