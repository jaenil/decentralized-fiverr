"use client";

import { useState, useEffect, useCallback } from "react";
import type { AxiosError } from "axios";
import { workerSignup } from "@/lib/api";
import { saveToken, loadToken, clearToken } from "@/lib/auth";

function extractErrorMessage(e: unknown, fallback: string): string {
  const ax = e as AxiosError<{ message?: string }>;
  return ax?.response?.data?.message ?? (e instanceof Error ? e.message : fallback);
}

export function useWorkerAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(loadToken());
  }, []);

  const login = useCallback(async (walletId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await workerSignup(walletId);
      saveToken(token);
      setToken(token);
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Login failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  return { token, isLoggedIn: Boolean(token), login, logout, loading, error };
}
