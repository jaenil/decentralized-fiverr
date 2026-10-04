"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { AxiosError } from "axios";
import { getBalance, requestPayout } from "@/lib/api";
import { lamportsToSol } from "@repo/config";

interface BalanceState {
  pendingSol: string;
  lockedSol: string;
  /** Raw lamport value for logic (e.g. disabling payout button) */
  rawPendingLamports: bigint;
  loadingBalance: boolean;
  payingOut: boolean;
  payoutMsg: string | null;
  balanceError: string | null;
  fetchBalance: () => Promise<void>;
  payout: () => Promise<void>;
}

const BalanceContext = createContext<BalanceState | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [pendingSol, setPendingSol] = useState("0.0000");
  const [lockedSol, setLockedSol] = useState("0.0000");
  const [rawPendingLamports, setRawPendingLamports] = useState(0n);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Prevent overlapping fetch calls
  const fetchingRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingBalance(true);
    setBalanceError(null);
    try {
      const { pendingAmount, lockedAmount } = await getBalance();
      const rawPending = BigInt(pendingAmount);
      setRawPendingLamports(rawPending);
      setPendingSol(lamportsToSol(pendingAmount));
      setLockedSol(lamportsToSol(lockedAmount));
    } catch {
      setBalanceError("Could not load balance. Please refresh.");
    } finally {
      setLoadingBalance(false);
      fetchingRef.current = false;
    }
  }, []);

  const payout = useCallback(async () => {
    setPayingOut(true);
    setPayoutMsg(null);
    try {
      const res = await requestPayout();
      // Display SOL, not raw lamports (fixes issue #5)
      setPayoutMsg(
        `✅ Payout of ${lamportsToSol(res.amount)} SOL initiated! Sig: ${res.signature}`
      );
      await fetchBalance();
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setPayoutMsg(ax?.response?.data?.message ?? "❌ Payout failed.");
    } finally {
      setPayingOut(false);
    }
  }, [fetchBalance]);

  return (
    <BalanceContext.Provider
      value={{
        pendingSol,
        lockedSol,
        rawPendingLamports,
        loadingBalance,
        payingOut,
        payoutMsg,
        balanceError,
        fetchBalance,
        payout,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance(): BalanceState {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used inside <BalanceProvider>");
  return ctx;
}
