# Simple User Frontend Implementation Plan

Build a small, working frontend in `apps/user-frontend` using the existing backend. This plan replaces the previous expanded plan. No application code has been implemented yet.

## Scope

Use the existing Next.js, React, and Tailwind setup. Use native `fetch`, one React auth context, and local component state. No additional packages are needed for the initial implementation.

All application changes stay inside `apps/user-frontend`. No backend changes, database migrations, worker frontend work, payment integration, or new testing framework.

## The four screens

| Route                      | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `/`                        | Simple welcome and sign-in form with wallet address and optional name        |
| `/dashboard`               | Links to create a task and open results by task ID                           |
| `/dashboard/create`        | Optional title, image selection/previews, signature field, and submit button |
| `/dashboard/task/[taskId]` | Images, vote counts, percentage bars, and a Refresh button                   |

Use a clean, responsive layout with consistent buttons, labelled inputs, and visible loading/error messages. A shared navbar provides Dashboard, Create task, and Sign out links.

## Existing API to use

Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:3000`. Append the paths below in the API helper.

| Request                        | Body                                             | Success response      |
| ------------------------------ | ------------------------------------------------ | --------------------- |
| `POST /v1/users/signup`        | `{ walletId, name }`                             | `{ token }`           |
| `GET /v1/users/preSignedUrl`   | None                                             | `{ url }`             |
| `POST /v1/users/task`          | `{ title?, signature, options: [{ imageUrl }] }` | `{ id }`              |
| `GET /v1/users/task?taskId=42` | None                                             | `{ taskId, options }` |

All requests except signup need `Authorization: Bearer <token>`. Each result option contains `id`, `image_url`, `task_id`, and `submissions`; its vote count is `submissions.length`.

There is no task-list endpoint, so the dashboard uses task-ID lookup. Wallet addresses and task signatures are currently accepted without verification; use the existing manual-entry flow and do not display payment-confirmed claims.

## Files

```text
apps/user-frontend/
  app/
    layout.tsx                       # Restore root layout and mount AuthProvider
    globals.css                      # Basic shared styling
    page.tsx                         # Welcome / sign-in
    dashboard/
      layout.tsx                     # Auth guard and navbar
      page.tsx                       # Create link and task-ID lookup
      create/page.tsx                # Create-task form and submission flow
      task/[taskId]/page.tsx         # Fetch and display results
  components/
    AuthProvider.tsx                 # Shared login/logout state
    Navbar.tsx
    ImageUploader.tsx                # File selection, previews, removal
    TaskResults.tsx                  # Images, counts, percentage bars
  lib/
    api.ts                           # API calls and response/error handling
    auth.ts                          # Token storage helpers
  types/
    index.ts                         # Request and response types
  .env.example
  .env.local                         # Local copy; do not commit
  package.json
  .gitignore
  next.config.ts
  README.md
```

Also update the existing `package.json`, `.gitignore`, `next.config.ts`, and README where needed. Keep form logic in its page initially; no separate feature folders or custom hook layer is necessary.

## Implementation order

### 1. Get the app running

- [ ] Restore the missing `app/layout.tsx` with global CSS and basic metadata.
- [ ] Run this frontend on port **3002** so it does not conflict with the backend on 3000 or the existing docs app on 3001. Update its dev/start scripts.
- [ ] Add the backend URL to `.env.example` and local configuration. Allow `.env.example` through the frontend's `.env*` ignore rule.
- [ ] Set up the shared page container, input/button styles, and mobile spacing.

**Done when:** the app opens at `http://localhost:3002`.

### 2. Add API calls and shared sign-in state

- [ ] Define the actual request/response types in `types/index.ts`. Keep calculated vote percentages separate from server response fields.
- [ ] Add `signup`, `getPreSignedUrl`, `uploadImage`, `createTask`, and `getTaskResults` to `lib/api.ts`. Handle failed HTTP responses and show the backend message when available.
- [ ] Store the JWT in localStorage through `lib/auth.ts`. Read it after mount through a single `AuthProvider` shared by all pages.
- [ ] Build the sign-in form on `/`. Redirect to `/dashboard` only after successful signup; keep errors on the form.
- [ ] Wait for stored-token loading before rendering protected pages. If no session exists, redirect to `/`.
- [ ] Add sign-out, which clears shared state and storage. Clear invalid/expired sessions when the backend rejects authentication; an ownership-related 403 should simply show an access error.

**Done when:** sign-in, refresh, protected navigation, and sign-out work consistently.

### 3. Build the dashboard

- [ ] Add a prominent **Create task** link.
- [ ] Add an **Open results** form accepting a positive integer task ID.
- [ ] Navigate valid IDs to `/dashboard/task/<id>` and show an inline message for invalid input.
- [ ] Add the shared navbar.

**Done when:** the user can reach both task creation and results without typing URLs.

### 4. Build image upload and task creation

- [ ] Add an optional title, required signature field, and image picker supporting multiple JPEG/PNG/WebP files. Require at least two images and use a simple 5 MiB per-file limit.
- [ ] Show local previews and remove buttons. Create preview URLs once and revoke them when files are removed or the component unmounts.
- [ ] On submit, upload images **one at a time**: request a signed URL, then PUT the file to that exact URL. This avoids simultaneous signing requests from this form against the backend's timestamp-based keys.
- [ ] Send file bytes and `Content-Type` to S3, without the application's JWT. For the current API, derive the object URL by removing the upload URL's query string. This requires the existing bucket to allow reading those objects; confirm it during the manual check.
- [ ] After all uploads succeed, send their URLs to `POST /v1/users/task`. Omit a blank title so the backend's default title applies.
- [ ] Disable submission while pending. Show straightforward progress such as **Uploading image 1 of 2** and **Creating task**. Keep inputs on failure; do not automatically retry the task POST.
- [ ] Navigate to the returned task ID on success.

**Done when:** selecting two images and submitting creates a task and opens its results.

### 5. Build the results screen

- [ ] Validate the route ID and fetch its results with the saved token.
- [ ] Display each option image, its submission count, and a simple CSS percentage bar. For zero total votes, display zero percentages and **No votes yet**.
- [ ] Add manual Refresh, loading feedback, and readable missing-task/access/network errors. Cancel or ignore old requests after navigation.
- [ ] Allow the actual S3 image host in `next.config.ts` when using `next/image`. Include image dimensions and useful alt text.

**Done when:** a user can open and refresh an owned task's actual results.

### 6. Check the complete flow

- [ ] Run frontend lint, TypeScript checking, and build:

```bash
npm run lint --workspace=user-frontend
npm exec --workspace=user-frontend -- tsc --noEmit
npm run build --workspace=user-frontend
```

- [ ] Manually check sign-in → dashboard → select/upload two images → create task → results → refresh → sign-out.
- [ ] Check an invalid task ID, missing task, failed request, and direct dashboard visit while signed out.
- [ ] Check image display, keyboard access, and the layout on a narrow screen.
- [ ] Add short setup/run instructions to the frontend README.

**Done when:** the complete user journey works against the existing backend, with clear errors when a request fails.

## Existing setup assumptions

The backend and its database must already be running, and S3 must permit browser uploads and image reads. Verify these through the integration flow; report any external blocker separately rather than expanding this frontend task into backend work.

The earlier review found a frontend lint-tooling conflict with the root TypeScript version. Recheck it during implementation and report it if it persists; it does not justify a monorepo-wide tooling overhaul in this plan.

## Complete file contents

Each block below contains the full proposed contents of that file, relative to `apps/user-frontend`. These are implementation instructions, not changes already applied to the application. Existing TypeScript, ESLint, and PostCSS configuration stays in place.

**Snippet verification:** All 20 files were extracted into a temporary folder and their TypeScript checked together with the installed frontend dependencies. Live API, upload, and browser checks remain part of implementation.

### `package.json`

Keep the installed dependencies and set explicit frontend ports.

```json
{
  "name": "user-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start --port 3002",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.3.7",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.7",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `.gitignore`

Preserve the existing ignore rules and allow the example environment file.

```gitignore
# Dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# Testing
/coverage

# Next.js
/.next/
/out/
/build

# Miscellaneous
.DS_Store
*.pem
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Environment files
.env*
!.env.example

# Vercel and TypeScript
.vercel
*.tsbuildinfo
next-env.d.ts
```

### `.env.example`

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### `.env.local`

Create this local copy during implementation. Do not commit it.

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### `next.config.ts`

The host matches the backend's current S3 bucket and default region. Adjust this exact host if the running backend uses a different region.

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
```

### `types/index.ts`

These types match the existing backend responses. Vote totals are calculated in the results component.

```ts
export interface AuthResponse {
  token: string;
}

export interface PreSignedUrlResponse {
  url: string;
}

export interface CreateTaskPayload {
  title?: string;
  signature: string;
  options: { imageUrl: string }[];
}

export interface CreateTaskResponse {
  id: number;
}

export interface Submission {
  id: number;
  worker_id: number;
  option_id: number;
  task_id: number;
}

export interface TaskOption {
  id: number;
  image_url: string;
  task_id: number;
  submissions: Submission[];
}

export interface TaskResultsResponse {
  taskId: number;
  options: TaskOption[];
}
```

### `lib/api.ts`

Keep all network calls here. API requests accept the token explicitly; S3 uploads never receive it. The 403 check uses the current backend's messages to distinguish expired authentication from task ownership denial.

```ts
import type {
  AuthResponse,
  CreateTaskPayload,
  CreateTaskResponse,
  PreSignedUrlResponse,
  TaskResultsResponse,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 ||
      (error.status === 403 &&
        ["Invalid or expired token.", "Invalid token payload."].includes(
          error.message,
        )))
  );
}

export function parseTaskId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
  if (!baseUrl) throw new Error("The backend URL is not configured.");

  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${baseUrl}/v1/users${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  if (body === null)
    throw new Error("The server returned an invalid response.");
  return body as T;
}

export async function signup(
  walletId: string,
  name: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/signup", {
    method: "POST",
    body: JSON.stringify({ walletId, name }),
  });
  if (typeof result.token !== "string" || !result.token) {
    throw new Error("The server did not return a sign-in token.");
  }
  return result;
}

export function getPreSignedUrl(token: string, signal?: AbortSignal) {
  return request<PreSignedUrlResponse>("/preSignedUrl", { signal }, token);
}

export async function uploadImage(
  file: File,
  token: string,
  signal?: AbortSignal,
): Promise<string> {
  const { url } = await getPreSignedUrl(token, signal);
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
    signal,
  });
  if (!response.ok) {
    throw new Error(`Could not upload ${file.name}. Please try again.`);
  }

  // This is readable only if the existing bucket permits object reads.
  const imageUrl = new URL(url);
  imageUrl.search = "";
  imageUrl.hash = "";
  return imageUrl.toString();
}

export async function createTask(
  payload: CreateTaskPayload,
  token: string,
  signal?: AbortSignal,
): Promise<CreateTaskResponse> {
  const result = await request<CreateTaskResponse>(
    "/task",
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
    token,
  );
  if (!Number.isSafeInteger(result.id) || result.id <= 0) {
    throw new Error("The server did not return a valid task ID.");
  }
  return result;
}

export async function getTaskResults(
  taskId: number,
  token: string,
  signal?: AbortSignal,
): Promise<TaskResultsResponse> {
  const result = await request<TaskResultsResponse>(
    `/task?taskId=${taskId}`,
    { signal },
    token,
  );
  if (
    result.taskId !== taskId ||
    !Array.isArray(result.options) ||
    result.options.some((option) => !Array.isArray(option.submissions))
  ) {
    throw new Error("The server returned invalid task results.");
  }
  return result;
}
```

### `lib/auth.ts`

```ts
export const TOKEN_KEY = "df_token";

export function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    throw new Error("Enable browser storage to stay signed in.");
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The provider still clears its in-memory session.
  }
}
```

### `components/AuthProvider.tsx`

One provider supplies every page with the same session. The request counter prevents a late login response from restoring a session after sign-out.

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isAuthError, signup } from "@/lib/api";
import { clearToken, loadToken, saveToken, TOKEN_KEY } from "@/lib/auth";

interface AuthContextValue {
  token: string | null;
  isReady: boolean;
  login: (walletId: string, name: string) => Promise<boolean>;
  logout: () => void;
  handleAuthError: (error: unknown, requestToken: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const attempt = useRef(0);

  useEffect(() => {
    let active = true;
    const restore = () => {
      if (!active) return;
      tokenRef.current = loadToken();
      setToken(tokenRef.current);
      setIsReady(true);
    };
    // Restore after the first render, keeping server/client output consistent.
    queueMicrotask(restore);
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === null) {
        attempt.current += 1;
        restore();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = useCallback(async (walletId: string, name: string) => {
    const currentAttempt = ++attempt.current;
    const result = await signup(walletId.trim(), name.trim());
    if (currentAttempt !== attempt.current) return false;
    saveToken(result.token);
    tokenRef.current = result.token;
    setToken(result.token);
    return true;
  }, []);

  const logout = useCallback(() => {
    attempt.current += 1;
    clearToken();
    tokenRef.current = null;
    setToken(null);
  }, []);

  const handleAuthError = useCallback(
    (error: unknown, requestToken: string) => {
      if (!isAuthError(error)) return false;
      if (tokenRef.current === requestToken) logout();
      return true;
    },
    [logout],
  );

  return (
    <AuthContext.Provider
      value={{ token, isReady, login, logout, handleAuthError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
```

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thumbnail Tasks",
  description: "Create thumbnail tasks and view their results.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### `app/globals.css`

Use a small set of reusable styles alongside the existing Tailwind import.

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: #f5f7fb;
  --text: #172033;
  --muted: #526078;
  --border: #d9e0ea;
  --accent: #4338ca;
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--background);
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
}
a {
  color: var(--accent);
}
h1,
h2,
p {
  margin: 0;
}
h1 {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
}
h2 {
  font-size: 1.15rem;
  font-weight: 700;
}
label {
  display: block;
  font-weight: 600;
}
input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: white;
  font: inherit;
}
button,
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: var(--accent);
  color: white;
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.secondary {
  background: white;
  color: var(--text);
  border-color: var(--border);
}
:focus-visible {
  outline: 3px solid #818cf8;
  outline-offset: 3px;
}
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.page {
  width: min(100% - 2rem, 58rem);
  margin: 2rem auto;
}
.narrow {
  max-width: 30rem;
}
.stack {
  display: grid;
  gap: 1rem;
}
.field {
  display: grid;
  gap: 0.4rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.between {
  justify-content: space-between;
}
.panel {
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 0.8rem;
  background: white;
}
.muted {
  color: var(--muted);
}
.error {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: #fff1f2;
  color: #9f1239;
  overflow-wrap: anywhere;
}
.navbar {
  border-bottom: 1px solid var(--border);
  background: white;
}
.navbar .page {
  margin-block: 0;
  padding-block: 1rem;
}
.brand {
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 1rem;
}
.preview {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0.5rem;
  background: #e9edf5;
}
.preview img {
  object-fit: contain;
}
.filename {
  overflow-wrap: anywhere;
  font-size: 0.9rem;
}
.bar {
  height: 0.75rem;
  overflow: hidden;
  background: #e9edf5;
  border-radius: 1rem;
}
.bar-fill {
  height: 100%;
  background: var(--accent);
}
```

### `app/page.tsx`

The home page doubles as the sign-in page, avoiding an extra landing/login route.

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const { token, isReady, login } = useAuth();
  const [walletId, setWalletId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && token) router.replace("/dashboard");
  }, [isReady, token, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !walletId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const signedIn = await login(walletId, name);
      if (signedIn) router.replace("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!isReady || token) {
    return (
      <main className="page" role="status">
        Loading…
      </main>
    );
  }

  return (
    <main className="page narrow stack">
      <h1>Thumbnail Tasks</h1>
      <p className="muted">
        Upload your options and see which thumbnails get the most votes.
      </p>
      <form className="panel stack" onSubmit={handleSubmit}>
        <h2>Development sign-in</h2>
        <p className="muted">
          Enter your wallet address to use the current sign-in flow.
        </p>
        <div className="field">
          <label htmlFor="walletId">Wallet address</label>
          <input
            id="walletId"
            value={walletId}
            required
            autoComplete="username"
            onChange={(event) => setWalletId(event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="name">Name (optional)</label>
          <input
            id="name"
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || !walletId.trim()}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

### `components/Navbar.tsx`

```tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const { logout } = useAuth();
  return (
    <header className="navbar">
      <nav className="page row between" aria-label="Main navigation">
        <Link className="brand" href="/dashboard">
          Thumbnail Tasks
        </Link>
        <div className="row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/create">Create task</Link>
          <button className="secondary" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
```

### `app/dashboard/layout.tsx`

Protected pages mount only after token restoration. The keyed content resets page state when the account changes.

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { token, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !token) router.replace("/");
  }, [isReady, token, router]);

  if (!isReady)
    return (
      <main className="page" role="status">
        Restoring session…
      </main>
    );
  if (!token)
    return (
      <main className="page" role="status">
        Returning to sign-in…
      </main>
    );

  return (
    <>
      <Navbar />
      <main key={token} className="page">
        {children}
      </main>
    </>
  );
}
```

### `app/dashboard/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseTaskId } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openResults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = parseTaskId(taskId.trim());
    if (id === null) {
      setError("Enter a valid positive task ID.");
      return;
    }
    setError(null);
    router.push(`/dashboard/task/${id}`);
  }

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      <section className="panel stack">
        <h2>Create a task</h2>
        <p className="muted">
          Upload at least two thumbnail options to get started.
        </p>
        <div>
          <Link className="button" href="/dashboard/create">
            Create task
          </Link>
        </div>
      </section>
      <form className="panel stack" onSubmit={openResults}>
        <h2>Open results</h2>
        <div className="field">
          <label htmlFor="taskId">Task ID</label>
          <input
            id="taskId"
            value={taskId}
            inputMode="numeric"
            required
            onChange={(event) => setTaskId(event.target.value)}
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit">Open results</button>
        </div>
      </form>
    </div>
  );
}
```

### `components/ImageUploader.tsx`

This component only selects and previews files; the create page performs the uploads. The nested preview component owns and cleans up its object URL.

```tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function FilePreview({ file, index }: { file: File; index: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="preview">
      {src && (
        <Image
          src={src}
          alt={`Option ${index + 1}: ${file.name}`}
          fill
          unoptimized
          sizes="(max-width: 600px) 100vw, 300px"
        />
      )}
    </div>
  );
}

export default function ImageUploader({
  files,
  onChange,
  disabled = false,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const accepted = [...files];
    const messages: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!ALLOWED_TYPES.has(file.type)) {
        messages.push(`${file.name}: choose a JPEG, PNG, or WebP image.`);
      } else if (file.size === 0 || file.size > MAX_BYTES) {
        messages.push(`${file.name}: choose a nonempty file up to 5 MiB.`);
      } else if (
        accepted.some((existing) => fileKey(existing) === fileKey(file))
      ) {
        messages.push(`${file.name} is already selected.`);
      } else {
        accepted.push(file);
      }
    }
    setError(messages.length ? messages.join(" ") : null);
    onChange(accepted);
  }

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="images">Thumbnail options</label>
        <input
          id="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          aria-describedby="image-help"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <p id="image-help" className="muted">
          Select at least two images. Maximum 5 MiB each.
        </p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="image-grid">
        {files.map((file, index) => (
          <div key={fileKey(file)} className="stack">
            <FilePreview file={file} index={index} />
            <p className="filename">{file.name}</p>
            <button
              type="button"
              className="secondary"
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              onClick={() => onChange(files.filter((item) => item !== file))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `app/dashboard/create/page.tsx`

Uploads are sequential. Successfully uploaded files are kept in an in-memory map so a failed upload can be retried without uploading those files again.

```tsx
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ImageUploader from "@/components/ImageUploader";
import { ApiError, createTask, uploadImage } from "@/lib/api";

export default function CreateTaskPage() {
  const router = useRouter();
  const { token, handleAuthError } = useAuth();
  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const uploaded = useRef(new Map<File, string>());

  useEffect(() => () => controller.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !token) return;
    if (files.length < 2 || !signature.trim()) {
      setError("Select at least two images and enter a signature.");
      return;
    }

    inFlight.current = true;
    setLoading(true);
    setError(null);
    const request = new AbortController();
    controller.current = request;
    let creating = false;
    let succeeded = false;

    try {
      const imageUrls: string[] = [];
      for (const [index, file] of files.entries()) {
        setStatus(`Uploading image ${index + 1} of ${files.length}…`);
        let imageUrl = uploaded.current.get(file);
        if (!imageUrl) {
          imageUrl = await uploadImage(file, token, request.signal);
          uploaded.current.set(file, imageUrl);
        }
        imageUrls.push(imageUrl);
      }
      if (request.signal.aborted) return;
      setStatus("Creating task…");
      creating = true;
      const result = await createTask(
        {
          ...(title.trim() ? { title: title.trim() } : {}),
          signature: signature.trim(),
          options: imageUrls.map((imageUrl) => ({ imageUrl })),
        },
        token,
        request.signal,
      );
      if (!request.signal.aborted) {
        succeeded = true;
        setStatus("Task created. Opening results…");
        router.push(`/dashboard/task/${result.id}`);
      }
    } catch (error) {
      if (request.signal.aborted || handleAuthError(error, token)) return;
      const message =
        creating && !(error instanceof ApiError)
          ? "The task may have been created, but its response was lost. Confirm its status before submitting again."
          : error instanceof Error
            ? error.message
            : "Could not create the task.";
      setError(message);
    } finally {
      if (!succeeded) inFlight.current = false;
      if (!request.signal.aborted && !succeeded) {
        setLoading(false);
        setStatus("");
      }
    }
  }

  return (
    <div className="stack">
      <h1>Create a task</h1>
      <form className="panel stack" onSubmit={handleSubmit} aria-busy={loading}>
        <fieldset className="stack" disabled={loading}>
          <div className="field">
            <label htmlFor="title">Title (optional)</label>
            <input
              id="title"
              value={title}
              placeholder="Select the most clickable thumbnail"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="signature">Signature</label>
            <input
              id="signature"
              value={signature}
              required
              aria-describedby="signature-help"
              onChange={(event) => setSignature(event.target.value)}
            />
            <p id="signature-help" className="muted">
              The current flow records this reference without verifying payment.
            </p>
          </div>
          <ImageUploader files={files} onChange={setFiles} disabled={loading} />
          <div>
            <button
              type="submit"
              disabled={loading || files.length < 2 || !signature.trim()}
            >
              {loading ? "Submitting…" : "Create task"}
            </button>
          </div>
        </fieldset>
        <p role="status" aria-live="polite">
          {status}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
```

### `components/TaskResults.tsx`

```tsx
import Image from "next/image";
import type { TaskOption } from "@/types";

export default function TaskResults({ options }: { options: TaskOption[] }) {
  const totalVotes = options.reduce(
    (total, option) => total + option.submissions.length,
    0,
  );
  const ordered = [...options].sort((a, b) => a.id - b.id);

  return (
    <section className="stack" aria-label="Vote results">
      <p>
        <strong>Total votes: {totalVotes}</strong>
      </p>
      {totalVotes === 0 && <p className="muted">No votes yet.</p>}
      {ordered.map((option, index) => {
        const votes = option.submissions.length;
        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
        return (
          <article key={option.id} className="panel stack">
            <h2>Option {index + 1}</h2>
            <div className="preview">
              <Image
                src={option.image_url}
                alt={`Thumbnail option ${index + 1}`}
                fill
                sizes="(max-width: 960px) 100vw, 900px"
              />
            </div>
            <p>
              {votes} {votes === 1 ? "vote" : "votes"} · {percentage.toFixed(1)}
              %
            </p>
            <div className="bar" aria-hidden="true">
              <div className="bar-fill" style={{ width: `${percentage}%` }} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
```

### `app/dashboard/task/[taskId]/page.tsx`

Keep the results page client-side for this simple token-based flow. Requests are cancelled when the task changes or the user leaves. Refresh preserves the previous result while the next request runs.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TaskResults from "@/components/TaskResults";
import { getTaskResults, parseTaskId } from "@/lib/api";
import type { TaskResultsResponse } from "@/types";

interface ResultState {
  key: string;
  data: TaskResultsResponse | null;
  loading: boolean;
  error: string | null;
}

export default function TaskResultsPage() {
  const { taskId: rawId } = useParams<{ taskId: string }>();
  const taskId = parseTaskId(rawId);
  const { token, handleAuthError } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<ResultState>({
    key: "",
    data: null,
    loading: true,
    error: null,
  });
  const requestKey = `${token}:${taskId}`;

  useEffect(() => {
    if (!token || taskId === null) return;
    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (active)
        setState((previous) => ({
          key: requestKey,
          data: previous.key === requestKey ? previous.data : null,
          loading: true,
          error: null,
        }));
    });

    getTaskResults(taskId, token, controller.signal)
      .then((data) => {
        if (active)
          setState({ key: requestKey, data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active || handleAuthError(error, token)) return;
        setState((previous) => ({
          key: requestKey,
          data: previous.key === requestKey ? previous.data : null,
          loading: false,
          error:
            error instanceof Error ? error.message : "Could not load results.",
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [taskId, token, requestKey, refresh, handleAuthError]);

  if (taskId === null) {
    return (
      <p className="error" role="alert">
        This task ID is invalid.
      </p>
    );
  }

  const current = state.key === requestKey;
  const loading = !current || state.loading;
  const data = current ? state.data : null;
  const error = current ? state.error : null;

  return (
    <div className="stack">
      <div className="row between">
        <h1>Task #{taskId} results</h1>
        <button
          className="secondary"
          type="button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {loading && (
        <p role="status">{data ? "Refreshing results…" : "Loading results…"}</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {data && <TaskResults options={data.options} />}
    </div>
  );
}
```

### `README.md`

````markdown
# User frontend

A simple Next.js frontend for signing in, uploading thumbnail options, creating tasks, and viewing results.

## Local setup

Start the existing backend on port 3000 with its database and AWS configuration available.

From the repository root, create the frontend environment file:

```bash
cp apps/user-frontend/.env.example apps/user-frontend/.env.local
```

Run the frontend:

```bash
npm run dev --workspace=user-frontend
```

Open http://localhost:3002.

## Use the app

1. Enter a wallet address and optional name on the home page.
2. Choose Create task from the dashboard.
3. Enter an optional title and required signature reference; select at least two images.
4. Submit, then view the task's images and vote counts.
5. Save the displayed task ID to reopen its results from the dashboard.

The current backend does not verify wallet ownership or task payments. This frontend uses its existing manual-entry flow.

S3 must allow browser PUT requests and reading uploaded images. The configured image host must match the bucket region used by the backend.

## Checks

```bash
npm run lint --workspace=user-frontend
npm exec --workspace=user-frontend -- tsc --noEmit
npm run build --workspace=user-frontend
```

Also check the full sign-in → upload → create → results → sign-out flow in a browser, including refresh, errors, and a mobile viewport.
````
