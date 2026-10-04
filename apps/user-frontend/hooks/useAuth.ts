"use client";

import { useState, useEffect, useCallback } from "react";
import { signup } from "@/lib/api";
import { saveToken, loadToken, clearToken } from "@/lib/auth";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setToken(loadToken());
  }, []);

  const login = useCallback(async (walletId: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await signup(walletId, name);
      saveToken(token);
      setToken(token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
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
