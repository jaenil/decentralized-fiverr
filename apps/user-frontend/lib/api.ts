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

/** GET /v1/users/nonce — get a unique nonce to sign for authentication */
export async function getNonce(): Promise<string> {
  const { data } = await apiClient.get<{ nonce: string }>("/v1/users/nonce");
  return data.nonce;
}

/** POST /v1/users/signup — upsert user by wallet address and signature, returns JWT */
export async function signup(
  address: string,
  nonce: string,
  signature: string,
  name: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/v1/users/signup", {
    address,
    nonce,
    signature,
    name,
  });
  return data;
}

/** GET /v1/users/preSignedUrl — get a pre-signed S3 upload URL */
export async function getPreSignedUrl(
  signal?: AbortSignal,
): Promise<PreSignedUrlResponse> {
  const { data } = await apiClient.get<PreSignedUrlResponse>(
    "/v1/users/preSignedUrl",
    { signal },
  );
  return data;
}

/**
 * PUT directly to S3 — does NOT go through our backend.
 * Uses a plain axios call (not apiClient) to avoid attaching
 * our JWT to an AWS endpoint.
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  await axios.put(presignedUrl, file, {
    headers: { "Content-Type": file.type },
    signal,
  });
}

/** POST /v1/users/task — create a task */
export async function createTask(
  payload: CreateTaskPayload,
  signal?: AbortSignal,
): Promise<CreateTaskResponse> {
  const { data } = await apiClient.post<CreateTaskResponse>(
    "/v1/users/task",
    payload,
    { signal },
  );
  return data;
}

export interface TaskResultsWire {
  taskId: number;
  options: Array<{
    id: number;
    image_url: string;
    task_id: number;
    submissions: unknown[];
  }>;
}

/** GET /v1/users/task?taskId=n — fetch task results */
export async function getTaskResults(
  taskId: number,
): Promise<TaskResultsResponse> {
  const { data } = await apiClient.get<TaskResultsWire>(`/v1/users/task`, {
    params: { taskId },
  });
  return {
    ...data,
    options: data.options.map((option) => ({
      ...option,
      submissionCount: option.submissions.length,
    })),
  };
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
      sentToken === `Bearer ${localStorage.getItem("df_token")}`
    ) {
      window.dispatchEvent(new Event("df:session-expired"));
    }
    return Promise.reject(error);
  },
);
