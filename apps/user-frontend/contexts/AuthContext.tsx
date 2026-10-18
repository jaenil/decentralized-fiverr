"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { getNonce, signup } from "@/lib/api";
import { clearToken, loadToken, saveToken } from "@/lib/auth";

export interface AuthState {
  token: string | null;
  status: "restoring" | "anonymous" | "authenticated";
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  login: (name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const address = connected ? publicKey?.toBase58() : undefined;
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const ownedToken = useRef<string | null>(null);
  const previous = useRef<{ connected: boolean; address?: string }>({
    connected: false,
  });

  const invalidate = useCallback(() => {
    generation.current += 1;
    busy.current = false;
    if (ownedToken.current && loadToken() === ownedToken.current) {
      clearToken();
      localStorage.removeItem("df_address");
    }
    ownedToken.current = null;
    setToken(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Restore external browser storage only after hydration.
    const saved = loadToken();
    const bound = localStorage.getItem("df_address");
    ownedToken.current = bound ? saved : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing browser storage after SSR
    setToken(bound ? saved : null);
    setReady(true);
    const onExpired = () => invalidate();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key !== "df_token" &&
        event.key !== "df_address" &&
        event.key !== null
      )
        return;
      generation.current += 1;
      busy.current = false;
      setLoading(false);
      const storedAddress = localStorage.getItem("df_address");
      const walletAddress = previous.current.address;
      const next =
        storedAddress && (!walletAddress || walletAddress === storedAddress)
          ? loadToken()
          : null;
      ownedToken.current = next;
      setToken(next);
      setError(null);
    };
    window.addEventListener("df:session-expired", onExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      generation.current += 1;
      window.removeEventListener("df:session-expired", onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, [invalidate]);

  useEffect(() => {
    const old = previous.current;
    const bound = localStorage.getItem("df_address");
    if (
      (old.connected && !connected) ||
      (old.address && address !== old.address) ||
      (address && bound && address !== bound)
    ) {
      invalidate();
    }
    previous.current = { connected, address };
  }, [address, connected, invalidate]);

  const login = useCallback(
    async (name = "") => {
      if (busy.current) return false;
      if (!address || !signMessage) {
        setError("Connect your wallet first");
        return false;
      }
      busy.current = true;
      const attempt = ++generation.current;
      setLoading(true);
      setError(null);
      try {
        const nonce = await getNonce();
        if (attempt !== generation.current) return false;
        const signature = bs58.encode(
          await signMessage(new TextEncoder().encode(nonce)),
        );
        if (attempt !== generation.current) return false;
        const result = await signup(address, nonce, signature, name);
        if (attempt !== generation.current) return false;
        localStorage.setItem("df_address", address);
        saveToken(result.token);
        ownedToken.current = result.token;
        setToken(result.token);
        return true;
      } catch (cause) {
        if (attempt === generation.current) {
          const message =
            cause instanceof Error
              ? cause.message
              : "Login failed. Please try again.";
          setError(
            message.includes("User rejected")
              ? "Signature request was cancelled."
              : message,
          );
        }
        return false;
      } finally {
        if (attempt === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [address, signMessage],
  );

  const logout = useCallback(async () => {
    invalidate();
    setError(null);
    try {
      await disconnect();
    } catch {
      /* Session is already cleared. */
    }
  }, [disconnect, invalidate]);

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
}
