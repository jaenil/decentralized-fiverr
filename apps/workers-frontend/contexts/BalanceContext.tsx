"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
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

  const requested = useRef(0);
  const active = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const payoutInFlight = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      requested.current += 1;
    };
  }, []);

  const fetchBalance = useCallback((): Promise<void> => {
    requested.current += 1;
    if (inFlight.current) return inFlight.current;
    const run = async () => {
      setLoadingBalance(true);
      setBalanceError(null);
      let version: number;
      do {
        version = requested.current;
        try {
          const result = await getBalance();
          if (active.current && version === requested.current) {
            const pending = BigInt(result.pendingAmount);
            const locked = BigInt(result.lockedAmount);
            if (pending < 0n || locked < 0n) throw new Error("Invalid balance");
            setRawPendingLamports(pending);
            setPendingSol(lamportsToSol(pending));
            setLockedSol(lamportsToSol(locked));
            setBalanceError(null);
          }
        } catch {
          if (active.current && version === requested.current)
            setBalanceError("Could not load balance. Please refresh.");
        }
      } while (active.current && version !== requested.current);
      if (active.current) setLoadingBalance(false);
    };
    inFlight.current = run().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, []);

  const payout = useCallback(async () => {
    if (
      payoutInFlight.current ||
      rawPendingLamports <= 0n ||
      Boolean(balanceError) ||
      loadingBalance
    )
      return;
    payoutInFlight.current = true;
    setPayingOut(true);
    setPayoutMsg(null);
    try {
      const result = await requestPayout();
      if (!active.current) return;
      setPayoutMsg(
        `Payout of ${lamportsToSol(result.amount)} SOL initiated. Reference: ${result.signature}`,
      );
      await fetchBalance();
    } catch (cause) {
      const error = cause as AxiosError<{ message?: string }>;
      if (active.current)
        setPayoutMsg(
          error.response?.data?.message ?? "Payout failed. Please try again.",
        );
    } finally {
      payoutInFlight.current = false;
      if (active.current) setPayingOut(false);
    }
  }, [fetchBalance, rawPendingLamports, balanceError, loadingBalance]);

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
