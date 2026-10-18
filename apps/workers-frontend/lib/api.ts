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

/** GET /v1/workers/nonce — get a unique nonce to sign for authentication */
export async function getWorkerNonce(): Promise<string> {
  const { data } = await apiClient.get<{ nonce: string }>("/v1/workers/nonce");
  return data.nonce;
}

/** POST /v1/workers/signup */
export async function workerSignup(
  walletId: string,
  nonce?: string,
  signature?: string,
): Promise<WorkerSignupResponse> {
  const { data } = await apiClient.post<WorkerSignupResponse>(
    "/v1/workers/signup",
    {
      walletId,
      address: walletId,
      nonce,
      signature,
    },
  );
  return data;
}

/** GET /v1/workers/nextTask */
export async function getNextTask(): Promise<NextTaskResponse> {
  const { data } = await apiClient.get<NextTaskResponse>(
    "/v1/workers/nextTask",
  );
  return data;
}

/** POST /v1/workers/submission */
export async function submitOption(
  taskId: number,
  optionId: number,
): Promise<SubmissionResponse> {
  const { data } = await apiClient.post<SubmissionResponse>(
    "/v1/workers/submission",
    {
      taskId,
      optionId,
    },
  );
  return data;
}

/** GET /v1/workers/balance */
export async function getBalance(): Promise<WorkerBalanceResponse> {
  const { data } = await apiClient.get<WorkerBalanceResponse>(
    "/v1/workers/balance",
  );
  return data;
}

/** POST /v1/workers/payout */
export async function requestPayout(): Promise<PayoutResponse> {
  const { data } = await apiClient.post<PayoutResponse>("/v1/workers/payout");
  return data;
}

// Ownership errors also use 403; expire only recognized authentication failures.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;
    const authFailure =
      error.response?.status === 401 ||
      (error.response?.status === 403 &&
        ["Invalid or expired token.", "Invalid token payload."].includes(
          message,
        ));
    const sentToken = error.config?.headers?.Authorization;
    if (
      typeof window !== "undefined" &&
      authFailure &&
      sentToken &&
      sentToken === `Bearer ${localStorage.getItem("dw_token")}`
    ) {
      window.dispatchEvent(new Event("dw:session-expired"));
    }
    return Promise.reject(error);
  },
);
