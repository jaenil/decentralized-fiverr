import { describe, it, expect } from 'vitest';
import axios from 'axios';
import 'dotenv/config';
import { signupUser, signupWorker } from './helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

// Axios instance that never throws on non-2xx statuses
const http = axios.create({ validateStatus: () => true });

describe('Users API — End-to-End', () => {
  let userToken: string;
  let userWalletId: string;
  let createdTaskId: number;

  // ─── 1. SIGNUP ─────────────────────────────────────────────────────────────

  it('POST /users/signup — happy path: creates a user and returns a valid JWT', async () => {
    userWalletId = `user_wallet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const res = await http.post(`${API_URL}/users/signup`, {
      name: 'E2E User',
      walletId: userWalletId,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(20);

    userToken = res.data.token;
  });

  it('POST /users/signup — upsert: same walletId updates name and returns new JWT', async () => {
    const res = await http.post(`${API_URL}/users/signup`, {
      name: 'Updated Name',
      walletId: userWalletId,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    userToken = res.data.token; // Refresh token
  });

  it('POST /users/signup — missing walletId and address: returns 400 Bad Request', async () => {
    const res = await http.post(`${API_URL}/users/signup`, {
      name: 'User Without Address',
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('walletId / address is required');
  });

  // ─── 2. PRESIGNED URL ───────────────────────────────────────────────────────

  it('GET /users/preSignedUrl — happy path: returns an S3 upload URL', async () => {
    const res = await http.get(`${API_URL}/users/preSignedUrl`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('url');
    expect(typeof res.data.url).toBe('string');
    expect(res.data.url).toContain('amazonaws.com');
    expect(res.data.url).toContain('decentralized-fiverr-jp');
  });

  it('GET /users/preSignedUrl — no auth header: returns 401', async () => {
    const res = await http.get(`${API_URL}/users/preSignedUrl`);
    expect(res.status).toBe(401);
    expect(res.data.message).toMatch(/no token/i);
  });

  it('GET /users/preSignedUrl — bad token: returns 403', async () => {
    const res = await http.get(`${API_URL}/users/preSignedUrl`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    expect(res.status).toBe(403);
  });

  it('GET /users/preSignedUrl — missing "Bearer" prefix: returns 401', async () => {
    const res = await http.get(`${API_URL}/users/preSignedUrl`, {
      headers: { Authorization: userToken },
    });
    expect(res.status).toBe(401);
  });

  it('GET /users/preSignedUrl — role isolation: worker token returns 403', async () => {
    const worker = await signupWorker();
    const res = await http.get(`${API_URL}/users/preSignedUrl`, {
      headers: { Authorization: `Bearer ${worker.token}` },
    });
    expect(res.status).toBe(403);
  });

  // ─── 3. CREATE TASK ─────────────────────────────────────────────────────────

  it('POST /users/task — happy path: creates task with 2 options and returns { id }', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        title: 'Select best thumbnail',
        signature: `sig_${Date.now()}`,
        options: [
          { imageUrl: 'https://example.com/thumb1.jpg' },
          { imageUrl: 'https://example.com/thumb2.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('id');
    expect(typeof res.data.id).toBe('number');
    createdTaskId = res.data.id;
  });

  it('POST /users/task — 3 options: succeeds (minimum is 2)', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        title: 'Select best of 3',
        signature: `sig3_${Date.now()}`,
        options: [
          { imageUrl: 'https://example.com/opt1.jpg' },
          { imageUrl: 'https://example.com/opt2.jpg' },
          { imageUrl: 'https://example.com/opt3.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('id');
  });

  it('POST /users/task — no title: defaults title and succeeds (200)', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        signature: `sig_default_${Date.now()}`,
        options: [
          { imageUrl: 'https://example.com/a.jpg' },
          { imageUrl: 'https://example.com/b.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('id');
  });

  it('POST /users/task — only 1 option: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        signature: 'sig_one',
        options: [{ imageUrl: 'https://example.com/single.jpg' }],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(411);
    expect(res.data.message).toBe('invalid input');
  });

  it('POST /users/task — empty options array: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      { signature: 'sig_empty', options: [] },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(411);
  });

  it('POST /users/task — missing signature: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        options: [
          { imageUrl: 'https://example.com/1.jpg' },
          { imageUrl: 'https://example.com/2.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(411);
  });

  it('POST /users/task — option missing imageUrl: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        signature: 'sig_broken',
        options: [{ imageUrl: 'https://example.com/1.jpg' }, {}],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    expect(res.status).toBe(411);
  });

  it('POST /users/task — no auth header: returns 401', async () => {
    const res = await http.post(`${API_URL}/users/task`, {
      signature: 'sig_noauth',
      options: [
        { imageUrl: 'https://example.com/1.jpg' },
        { imageUrl: 'https://example.com/2.jpg' },
      ],
    });

    expect(res.status).toBe(401);
  });

  it('POST /users/task — role isolation: worker token returns 403', async () => {
    const worker = await signupWorker();
    const res = await http.post(
      `${API_URL}/users/task`,
      {
        signature: 'sig_worker_token',
        options: [
          { imageUrl: 'https://example.com/1.jpg' },
          { imageUrl: 'https://example.com/2.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${worker.token}` } }
    );

    expect(res.status).toBe(403);
  });

  // ─── 4. GET TASK ────────────────────────────────────────────────────────────

  it('GET /users/task?taskId=N — happy path: returns task and options array', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: createdTaskId },
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(200);
    expect(Number(res.data.taskId)).toBe(createdTaskId);
    expect(Array.isArray(res.data.options)).toBe(true);
    expect(res.data.options.length).toBeGreaterThanOrEqual(2);
    res.data.options.forEach((opt: any) => {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('image_url');
      expect(opt).toHaveProperty('submissions');
    });
  });

  it('GET /users/task — ownership check: different user returns 403 Unauthorized', async () => {
    const otherUser = await signupUser();
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: createdTaskId },
      headers: { Authorization: `Bearer ${otherUser.token}` },
    });

    expect(res.status).toBe(403);
    expect(res.data.message).toBe('Unauthorized');
  });

  it('GET /users/task — non-existent taskId: returns 404 Task not found', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: 999999999 },
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(404);
    expect(res.data.message).toBe('Task not found');
  });

  it('GET /users/task — taskId=0: returns 404 (valid number, no matching record)', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: 0 },
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(404);
    expect(res.data.message).toBe('Task not found');
  });

  it('GET /users/task — non-numeric taskId (taskId=abc): Zod rejects with 411', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: 'abc' },
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(411);
    expect(res.data.message).toBe('invalid input');
  });

  it('GET /users/task — missing taskId query param: Zod rejects with 411', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(411);
  });

  it('GET /users/task — no auth header: returns 401', async () => {
    const res = await http.get(`${API_URL}/users/task`, {
      params: { taskId: createdTaskId },
    });

    expect(res.status).toBe(401);
  });
});
