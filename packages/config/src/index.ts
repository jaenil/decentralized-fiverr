/**
 * Shared constants used across apps and backend.
 * Single source of truth — do NOT duplicate these in individual apps.
 */

/** Number of lamports in one SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000 as const;

/**
 * Convert a lamport amount (as bigint or string coming over the wire)
 * to a SOL string with 4 decimal places.
 *
 * Uses pure BigInt arithmetic to avoid Number precision loss for large balances.
 * Safe up to ~9.2 × 10^18 lamports (BigInt max).
 */
export function lamportsToSol(lamports: bigint | string): string {
  const n = typeof lamports === "bigint" ? lamports : BigInt(lamports);
  const lps = BigInt(LAMPORTS_PER_SOL);
  const whole = n / lps;
  const remainder = n % lps;
  // 4 decimal places: remainder * 10000 / LAMPORTS_PER_SOL
  const decimals = (remainder * 10000n) / lps;
  return `${whole}.${String(decimals).padStart(4, "0")}`;
}
