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

// ─── Worker API types ──────────────────────────────────────────────────────

/**
 * All bigint fields from Postgres are transmitted over JSON as strings.
 * Do not cast to Number — use BigInt() or lamportsToSol() from @repo/config.
 */

export interface WorkerSignupResponse {
  token: string;
}

/** A single option (image) within a task. */
export interface TaskOption {
  id: number;
  /** CloudFront/S3 URL */
  image_url: string;
  task_id: number;
}

/**
 * Task shape returned by GET /nextTask and POST /submission.
 * `amount` is a Postgres bigint transmitted as a string.
 */
export interface WorkerTask {
  id: number;
  title: string;
  options: TaskOption[];
  user_id: number;
  /** Wire type: string (bigint serialized by JSON). Use lamportsToSol() to display. */
  amount: string;
}

export interface NextTaskResponse {
  task: WorkerTask;
}

export interface SubmissionResponse {
  submissionId: number;
  /** null when no further tasks remain for this worker. */
  nextTask: WorkerTask | null;
}

/**
 * Balance shape from GET /balance.
 * Both fields are Postgres bigints transmitted as strings over JSON.
 */
export interface WorkerBalanceResponse {
  /** Earned but not yet paid out. Wire type: string. */
  pendingAmount: string;
  /** Currently being processed in a payout. Wire type: string. */
  lockedAmount: string;
}

export interface PayoutResponse {
  message: string;
  /** Lamport amount as string. Use lamportsToSol() to display. */
  amount: string;
  signature: string;
}

// ─── (Future) Web3 / Solana types go here ─────────────────────────────────

