import axios from "axios";
import type {
  AuthResponse,
  PreSignedUrlResponse,
  CreateTaskPayload,
  CreateTaskResponse,
  TaskResultsResponse,
} from "@repo/types";

// ─── Axios instance ────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000",
});

/**
 * Request interceptor — attaches the JWT from localStorage to every
 * request automatically. Runs only on the client (localStorage is
 * undefined during SSR, so the header is simply omitted).
 */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("df_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Endpoints ────────────────────────────────────────────────────────────

/** POST /v1/users/signup — upsert user by wallet address, returns JWT */
export async function signup(
  walletId: string,
  name: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/v1/users/signup", {
    walletId,
    name,
  });
  return data;
}

/** GET /v1/users/preSignedUrl — get a pre-signed S3 upload URL */
export async function getPreSignedUrl(): Promise<PreSignedUrlResponse> {
  const { data } = await apiClient.get<PreSignedUrlResponse>(
    "/v1/users/preSignedUrl"
  );
  return data;
}

/**
 * PUT directly to S3 — does NOT go through our backend.
 * Uses a plain axios call (not apiClient) to avoid attaching
 * our JWT to an AWS endpoint.
 */
export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  await axios.put(presignedUrl, file, {
    headers: { "Content-Type": file.type },
  });
}

/** POST /v1/users/task — create a task */
export async function createTask(
  payload: CreateTaskPayload
): Promise<CreateTaskResponse> {
  const { data } = await apiClient.post<CreateTaskResponse>(
    "/v1/users/task",
    payload
  );
  return data;
}

/** GET /v1/users/task?taskId=n — fetch task results */
export async function getTaskResults(
  taskId: number
): Promise<TaskResultsResponse> {
  const { data } = await apiClient.get<TaskResultsResponse>(
    `/v1/users/task`,
    { params: { taskId } }
  );
  return data;
}
