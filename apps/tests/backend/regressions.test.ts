import { describe, it, expect } from "vitest";
import axios from "axios";
import { signedSignup, signupUser, signupWorker } from "./helpers/auth";

const API_URL = process.env.API_URL || "http://localhost:3000/v1";
const http = axios.create({ validateStatus: () => true });
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
async function task(
  token: string,
  signature = `manual-test-${crypto.randomUUID()}`,
) {
  const result = await http.post(
    `${API_URL}/users/task`,
    {
      signature,
      options: [
        { imageUrl: "https://example.com/a.jpg" },
        { imageUrl: "https://example.com/b.jpg" },
      ],
    },
    { headers: headers(token) },
  );
  expect(result.status).toBe(200);
  const detail = await http.get(`${API_URL}/users/task`, {
    params: { taskId: result.data.id },
    headers: headers(token),
  });
  expect(detail.status).toBe(200);
  return { taskId: result.data.id, optionId: detail.data.options[0].id };
}

describe("Signed customer authentication", () => {
  it.each(["address", "nonce", "signature"] as const)(
    "rejects missing %s",
    async (field) => {
      const payload: Record<string, string> = await signedSignup();
      delete payload[field];
      const result = await http.post(`${API_URL}/users/signup`, payload);
      expect(result.status).toBe(400);
      expect(result.data.token).toBeUndefined();
    },
  );

  it("rejects a valid signature if the signed nonce is changed", async () => {
    const payload = await signedSignup();
    const result = await http.post(`${API_URL}/users/signup`, {
      ...payload,
      nonce: payload.nonce + " altered",
    });
    expect(result.status).toBe(401);
    expect(result.data.token).toBeUndefined();
  });

  it("rejects a signature from another wallet", async () => {
    const payload = await signedSignup();
    const other = await signedSignup();
    const result = await http.post(`${API_URL}/users/signup`, {
      ...payload,
      address: other.address,
    });
    expect(result.status).toBe(401);
    expect(result.data.token).toBeUndefined();
  });

  it.each([{ address: "not-a-public-key" }, { signature: "not-base58-0" }])(
    "rejects malformed signing data %j",
    async (override) => {
      const result = await http.post(`${API_URL}/users/signup`, {
        ...(await signedSignup()),
        ...override,
      });
      expect(result.status).toBe(401);
      expect(result.data.token).toBeUndefined();
    },
  );
});

describe("Database regression coverage", () => {
  it("concurrent duplicate votes create one submission and credit only one reward", async () => {
    const user = await signupUser();
    const worker = await signupWorker();
    const input = await task(user.token);
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        http.post(`${API_URL}/workers/submission`, input, {
          headers: headers(worker.token),
        }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([
      200, 500, 500, 500,
    ]);
    const balance = await http.get(`${API_URL}/workers/balance`, {
      headers: headers(worker.token),
    });
    expect(balance.status).toBe(200);
    expect(balance.data).toEqual({
      pendingAmount: "10000000",
      lockedAmount: "0",
    });
    const detail = await http.get(`${API_URL}/users/task`, {
      params: { taskId: input.taskId },
      headers: headers(user.token),
    });
    expect(detail.status).toBe(200);
    expect(
      detail.data.options.flatMap(
        (option: { submissions: unknown[] }) => option.submissions,
      ),
    ).toHaveLength(1);
  });
});

// Characterizations, NOT evidence that these safeguards are implemented.
// Replace these assertions with rejection/completion assertions when backend work lands.
describe("Known unfinished behavior — current contract", () => {
  it("currently accepts replay of the same signed login payload", async () => {
    const payload = await signedSignup();
    const first = await http.post(`${API_URL}/users/signup`, payload);
    expect(first.status).toBe(200);
    const replay = await http.post(`${API_URL}/users/signup`, payload);
    expect(replay.status).toBe(200);
    expect(replay.data.token).toEqual(expect.any(String));
  });

  it("currently accepts an unfunded signature and reuses it for another task", async () => {
    const user = await signupUser();
    const signature = `unfunded-${crypto.randomUUID()}`;
    const first = await task(user.token, signature);
    const second = await task(user.token, signature);
    expect(second.taskId).not.toBe(first.taskId);
  });

  it("currently leaves payouts locked with a placeholder signature, including a repeated zero payout", async () => {
    const user = await signupUser();
    const worker = await signupWorker();
    const input = await task(user.token);
    const vote = await http.post(`${API_URL}/workers/submission`, input, {
      headers: headers(worker.token),
    });
    expect(vote.status).toBe(200);
    const payout = await http.post(
      `${API_URL}/workers/payout`,
      {},
      { headers: headers(worker.token) },
    );
    expect(payout.status).toBe(200);
    expect(payout.data).toEqual({
      message: "Payout initiated",
      amount: "10000000",
      signature: "abkdkdkd",
    });
    const repeated = await http.post(
      `${API_URL}/workers/payout`,
      {},
      { headers: headers(worker.token) },
    );
    expect(repeated.status).toBe(200);
    expect(repeated.data.amount).toBe("0");
    const balance = await http.get(`${API_URL}/workers/balance`, {
      headers: headers(worker.token),
    });
    expect(balance.status).toBe(200);
    expect(balance.data).toEqual({
      pendingAmount: "0",
      lockedAmount: "10000000",
    });
  });

  it.todo(
    "Reject expired, consumed, or never-issued login challenges once nonce storage exists",
  );
  it.todo(
    "Verify payment sender, recipient, amount, confirmation and transaction reuse once RPC verification exists",
  );
  it.todo(
    "Preserve both rewards for concurrent votes on DIFFERENT tasks with deterministic transaction barriers",
  );
  it.todo(
    "Confirm a payout and clear locked funds once transfer/confirmation exists",
  );
  it.todo(
    "Recover failed/unknown transfers and retries without paying twice once payout recovery exists",
  );
});
