import axios from "axios";
import type {
  WorkerSignupResponse,
  NextTaskResponse,
  SubmissionResponse,
  WorkerBalanceResponse,
  PayoutResponse,
} from "@repo/types";

export type { WorkerTask, TaskOption } from "@repo/types";

// ─── Axios Instance ──────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000",
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dw_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Endpoints ───────────────────────────────────────────────────────────────

/** POST /v1/workers/signup */
export async function workerSignup(walletId: string): Promise<WorkerSignupResponse> {
  const { data } = await apiClient.post<WorkerSignupResponse>("/v1/workers/signup", {
    walletId,
  });
  return data;
}

/** GET /v1/workers/nextTask */
export async function getNextTask(): Promise<NextTaskResponse> {
  const { data } = await apiClient.get<NextTaskResponse>("/v1/workers/nextTask");
  return data;
}

/** POST /v1/workers/submission */
export async function submitOption(
  taskId: number,
  optionId: number
): Promise<SubmissionResponse> {
  const { data } = await apiClient.post<SubmissionResponse>("/v1/workers/submission", {
    taskId,
    optionId,
  });
  return data;
}

/** GET /v1/workers/balance */
export async function getBalance(): Promise<WorkerBalanceResponse> {
  const { data } = await apiClient.get<WorkerBalanceResponse>("/v1/workers/balance");
  return data;
}

/** POST /v1/workers/payout */
export async function requestPayout(): Promise<PayoutResponse> {
  const { data } = await apiClient.post<PayoutResponse>("/v1/workers/payout");
  return data;
}
