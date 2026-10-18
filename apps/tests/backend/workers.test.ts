import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import 'dotenv/config';
import { createWallet, signedWorkerSignup, signupUser, signupWorker } from './helpers/auth';
import bs58 from 'bs58';

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';
const http = axios.create({ validateStatus: () => true });

const LAMPORTS_PER_SOL = 1_000_000_000;
const EXPECTED_SUBMISSION_REWARD = Math.floor(0.01 * LAMPORTS_PER_SOL); // 10,000,000

describe('Workers API — End-to-End', () => {
  let workerToken: string;
  let workerWalletId: string;
  const workerWallet = createWallet();

  let seededTaskId: number;
  let seededOptionId: number;

  // ─── SEED PREREQUISITE DATA ────────────────────────────────────────────────
  beforeAll(async () => {
    const user = await signupUser();
    const taskRes = await http.post(
      `${API_URL}/users/task`,
      {
        title: 'Worker Suite Seed Task',
        signature: `seed_sig_${Date.now()}`,
        options: [
          { imageUrl: 'https://seed.example.com/opt-1.jpg' },
          { imageUrl: 'https://seed.example.com/opt-2.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );

    if (taskRes.status !== 200) {
      throw new Error(`Seed task creation failed: ${JSON.stringify(taskRes.data)}`);
    }
    seededTaskId = taskRes.data.id;

    const detailRes = await http.get(`${API_URL}/users/task`, {
      params: { taskId: seededTaskId },
      headers: { Authorization: `Bearer ${user.token}` },
    });
    seededOptionId = detailRes.data.options[0].id;
  });

  // ─── 1. SIGNUP ─────────────────────────────────────────────────────────────

  it('POST /workers/signup — happy path: creates a worker and returns a valid JWT', async () => {
    workerWalletId = bs58.encode(workerWallet.publicKey);
    const res = await http.post(`${API_URL}/workers/signup`, await signedWorkerSignup(workerWallet));

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(20);

    workerToken = res.data.token;
  });

  it('POST /workers/signup — upsert: same walletId returns new JWT without errors', async () => {
    const res = await http.post(`${API_URL}/workers/signup`, await signedWorkerSignup(workerWallet));

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    workerToken = res.data.token;
  });

  it('POST /workers/signup — missing address, nonce and signature: returns 400 Bad Request', async () => {
    const res = await http.post(`${API_URL}/workers/signup`, {});
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('address, nonce, and signature are required');
  });

  it('POST /workers/signup — invalid signature: returns 401 Unauthorized', async () => {
    const payload = await signedWorkerSignup(workerWallet);
    payload.signature = bs58.encode(new Uint8Array(64).fill(1));
    const res = await http.post(`${API_URL}/workers/signup`, payload);
    expect(res.status).toBe(401);
  });

  // ─── 2. GET NEXT TASK ───────────────────────────────────────────────────────

  it('GET /workers/nextTask — happy path: returns a task with options', async () => {
    const res = await http.get(`${API_URL}/workers/nextTask`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('task');
    expect(res.data.task).toHaveProperty('id');
    expect(res.data.task).toHaveProperty('title');
    expect(Array.isArray(res.data.task.options)).toBe(true);
    expect(res.data.task.options.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /workers/nextTask — no auth header: returns 401', async () => {
    const res = await http.get(`${API_URL}/workers/nextTask`);
    expect(res.status).toBe(401);
  });

  it('GET /workers/nextTask — bad token: returns 403', async () => {
    const res = await http.get(`${API_URL}/workers/nextTask`, {
      headers: { Authorization: 'Bearer bad.token.string' },
    });
    expect(res.status).toBe(403);
  });

  it('GET /workers/nextTask — role isolation: user token returns 403', async () => {
    const user = await signupUser();
    const res = await http.get(`${API_URL}/workers/nextTask`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect(res.status).toBe(403);
  });

  // ─── 3. GET BALANCE (INITIAL) ──────────────────────────────────────────────

  it('GET /workers/balance — initial state: pending_amount = "0", locked_amount = "0"', async () => {
    const res = await http.get(`${API_URL}/workers/balance`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('pendingAmount');
    expect(res.data).toHaveProperty('lockedAmount');
    expect(res.data.pendingAmount).toBe('0');
    expect(res.data.lockedAmount).toBe('0');
  });

  it('GET /workers/balance — no auth header: returns 401', async () => {
    const res = await http.get(`${API_URL}/workers/balance`);
    expect(res.status).toBe(401);
  });

  // ─── 4. SUBMISSION VALIDATION & EXECUTION ───────────────────────────────────

  it('POST /workers/submission — missing optionId: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: seededTaskId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(411);
    expect(res.data.message).toBe('invalid input');
  });

  it('POST /workers/submission — missing taskId: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { optionId: seededOptionId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(411);
  });

  it('POST /workers/submission — non-numeric taskId: Zod rejects with 411', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: 'not-a-number', optionId: seededOptionId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(411);
  });

  it('POST /workers/submission — non-existent taskId: returns 404 Task not found', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: 999999999, optionId: seededOptionId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(404);
    expect(res.data.message).toBe('Task not found');
  });

  it('POST /workers/submission — option does not belong to task: returns 404', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: seededTaskId, optionId: 999999999 }, // option does not match task_id
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(404);
    expect(res.data.message).toBe('Option not found for this task');
  });

  it('POST /workers/submission — no auth header: returns 401', async () => {
    const res = await http.post(`${API_URL}/workers/submission`, {
      taskId: seededTaskId,
      optionId: seededOptionId,
    });

    expect(res.status).toBe(401);
  });

  it('POST /workers/submission — happy path: creates submission and returns nextTask', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: seededTaskId, optionId: seededOptionId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('submissionId');
    expect(typeof res.data.submissionId).toBe('number');
    expect('nextTask' in res.data).toBe(true);
  });

  it('POST /workers/submission — duplicate submission: returns 500 (DB unique violation)', async () => {
    const res = await http.post(
      `${API_URL}/workers/submission`,
      { taskId: seededTaskId, optionId: seededOptionId },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toBe('Failed to submit task');
  });

  // ─── 5. BALANCE & PAYOUT LIFECYCLE ─────────────────────────────────────────

  it('GET /workers/balance — after 1 submission: pendingAmount = 10,000,000 lamports', async () => {
    const res = await http.get(`${API_URL}/workers/balance`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data.pendingAmount).toBe(EXPECTED_SUBMISSION_REWARD.toString());
    expect(res.data.lockedAmount).toBe('0');
  });

  it('POST /workers/payout — no auth header: returns 401', async () => {
    const res = await http.post(`${API_URL}/workers/payout`);
    expect(res.status).toBe(401);
  });

  it('POST /workers/payout — happy path: moves pending into locked amount', async () => {
    const res = await http.post(
      `${API_URL}/workers/payout`,
      {},
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Payout initiated');
    expect(res.data.amount).toBe(EXPECTED_SUBMISSION_REWARD.toString());
    expect(res.data).toHaveProperty('signature');
  });

  it('GET /workers/balance — after payout: pendingAmount = "0", lockedAmount = 10,000,000', async () => {
    const res = await http.get(`${API_URL}/workers/balance`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.data.pendingAmount).toBe('0');
    expect(res.data.lockedAmount).toBe(EXPECTED_SUBMISSION_REWARD.toString());
  });

  it('POST /workers/payout — when pending is 0: initiates payout with amount "0"', async () => {
    const res = await http.post(
      `${API_URL}/workers/payout`,
      {},
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data.amount).toBe('0');
  });

  // ─── 6. MULTI-WORKER ISOLATION ─────────────────────────────────────────────

  it('Two distinct workers can independently submit on the same task', async () => {
    const user = await signupUser();
    const taskRes = await http.post(
      `${API_URL}/users/task`,
      {
        title: 'Multi-worker Task',
        signature: `multi_sig_${Date.now()}`,
        options: [
          { imageUrl: 'https://example.com/multi-1.jpg' },
          { imageUrl: 'https://example.com/multi-2.jpg' },
        ],
      },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    const multiTaskId = taskRes.data.id;

    const detailRes = await http.get(`${API_URL}/users/task`, {
      params: { taskId: multiTaskId },
      headers: { Authorization: `Bearer ${user.token}` },
    });
    const multiOptionId = detailRes.data.options[0].id;

    const [workerA, workerB] = await Promise.all([signupWorker(), signupWorker()]);

    const [resA, resB] = await Promise.all([
      http.post(
        `${API_URL}/workers/submission`,
        { taskId: multiTaskId, optionId: multiOptionId },
        { headers: { Authorization: `Bearer ${workerA.token}` } }
      ),
      http.post(
        `${API_URL}/workers/submission`,
        { taskId: multiTaskId, optionId: multiOptionId },
        { headers: { Authorization: `Bearer ${workerB.token}` } }
      ),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.data.submissionId).not.toBe(resB.data.submissionId);
  });
});
