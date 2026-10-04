// ─── Auth ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
}

// ─── S3 ───────────────────────────────────────────────────────────────────

export interface PreSignedUrlResponse {
  url: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title?: string;
  signature: string;
  options: { imageUrl: string }[];
}

export interface CreateTaskResponse {
  id: number;
}

export interface OptionWithSubmissions {
  id: number;
  image_url: string;
  task_id: number;
  submissions: unknown[];     // raw rows from backend
  submissionCount: number;   // derived on the client from submissions.length
}

export type SubmissionCount = OptionWithSubmissions;

export interface TaskResultsResponse {
  taskId: number;
  options: OptionWithSubmissions[];
}

// ─── (Future) Worker types go here ────────────────────────────────────────
// ─── (Future) Web3 / Solana types go here ─────────────────────────────────
