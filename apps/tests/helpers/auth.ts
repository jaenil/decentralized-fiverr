import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

/**
 * Signs up a new user with a unique wallet address and returns the JWT.
 */
export async function signupUser(walletId?: string): Promise<{ token: string; walletId: string }> {
  const id = walletId ?? `user_wallet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const res = await axios.post(`${API_URL}/users/signup`, {
    name: 'E2E Test User',
    walletId: id,
  });

  if (res.status !== 200 || !res.data.token) {
    throw new Error(`signupUser failed: ${JSON.stringify(res.data)}`);
  }

  return { token: res.data.token, walletId: id };
}

/**
 * Signs up a new worker with a unique wallet address and returns the JWT.
 */
export async function signupWorker(walletId?: string): Promise<{ token: string; walletId: string }> {
  const id = walletId ?? `worker_wallet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const res = await axios.post(`${API_URL}/workers/signup`, {
    walletId: id,
  });

  if (res.status !== 200 || !res.data.token) {
    throw new Error(`signupWorker failed: ${JSON.stringify(res.data)}`);
  }

  return { token: res.data.token, walletId: id };
}
