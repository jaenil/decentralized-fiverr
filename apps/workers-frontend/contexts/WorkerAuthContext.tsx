"use client";
import {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import axios from "axios";
import { workerSignup } from "@/lib/api";
import { loadToken, saveToken, clearToken } from "@/lib/auth";
interface WorkerAuthState {
  token: string | null;
  status: "restoring" | "anonymous" | "authenticated";
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  login: (walletId: string) => Promise<boolean>;
  logout: () => void;
}
export const WorkerAuthContext = createContext<WorkerAuthState | null>(null);
export function WorkerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const logout = useCallback(() => {
    generation.current += 1;
    busy.current = false;
    clearToken();
    setToken(null);
    setLoading(false);
    setError(null);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore external browser storage after hydration
    setToken(loadToken());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "dw_token" && event.key !== null) return;
      generation.current += 1;
      busy.current = false;
      setToken(loadToken());
      setLoading(false);
      setError(null);
    };
    window.addEventListener("dw:session-expired", logout);
    window.addEventListener("storage", onStorage);
    return () => {
      generation.current += 1;
      window.removeEventListener("dw:session-expired", logout);
      window.removeEventListener("storage", onStorage);
    };
  }, [logout]);
  const login = useCallback(async (walletId: string) => {
    if (busy.current || !walletId.trim()) return false;
    busy.current = true;
    const attempt = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await workerSignup(walletId.trim());
      if (attempt !== generation.current) return false;
      saveToken(result.token);
      setToken(result.token);
      return true;
    } catch (cause) {
      if (attempt === generation.current) {
        const detail = axios.isAxiosError(cause)
          ? cause.response?.data?.message
          : undefined;
        setError(
          typeof detail === "string"
            ? detail
            : cause instanceof Error
              ? cause.message
              : "Login failed. Please try again.",
        );
      }
      return false;
    } finally {
      if (attempt === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);
  return (
    <WorkerAuthContext.Provider
      value={{
        token,
        status: !ready ? "restoring" : token ? "authenticated" : "anonymous",
        isLoggedIn: Boolean(token),
        loading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </WorkerAuthContext.Provider>
  );
}
