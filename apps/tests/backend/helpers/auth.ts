import axios from "axios";

import nacl from "tweetnacl";
import bs58 from "bs58";

const API_URL = process.env.API_URL || "http://localhost:3000/v1";

// Ephemeral signing keys only: never use a real wallet's secret key in tests.
export const createWallet = () => nacl.sign.keyPair();
export async function signedSignup(
  wallet = createWallet(),
  name = "E2E Test User",
) {
  const { data } = await axios.get(`${API_URL}/users/nonce`);
  if (typeof data.nonce !== "string" || !data.nonce)
    throw new Error("Missing nonce");
  return {
    name,
    address: bs58.encode(wallet.publicKey),
    nonce: data.nonce,
    signature: bs58.encode(
      nacl.sign.detached(
        new TextEncoder().encode(data.nonce),
        wallet.secretKey,
      ),
    ),
  };
}

export async function signupUser(
  wallet = createWallet(),
): Promise<{ token: string; walletId: string }> {
  const payload = await signedSignup(wallet);
  const res = await axios.post(`${API_URL}/users/signup`, payload);
  if (res.status !== 200 || !res.data.token)
    throw new Error("signupUser did not return a token");
  return { token: res.data.token, walletId: payload.address };
}

export async function signedWorkerSignup(
  wallet = createWallet(),
) {
  const { data } = await axios.get(`${API_URL}/workers/nonce`);
  if (typeof data.nonce !== "string" || !data.nonce)
    throw new Error("Missing nonce");
  return {
    address: bs58.encode(wallet.publicKey),
    nonce: data.nonce,
    signature: bs58.encode(
      nacl.sign.detached(
        new TextEncoder().encode(data.nonce),
        wallet.secretKey,
      ),
    ),
  };
}

/**
 * Signs up a new worker with a signed wallet address and returns the JWT.
 */
export async function signupWorker(
  wallet = createWallet(),
): Promise<{ token: string; walletId: string }> {
  const payload = await signedWorkerSignup(wallet);
  const res = await axios.post(`${API_URL}/workers/signup`, payload);

  if (res.status !== 200 || !res.data.token) {
    throw new Error(`signupWorker failed: ${JSON.stringify(res.data)}`);
  }

  return { token: res.data.token, walletId: payload.address };
}
