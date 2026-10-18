"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WalletMultiButton } from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";

export default function LoginPage() {
  const { connected } = useWallet();
  const { login, loading, error } = useAuth();
  const [name, setName] = useState("");
  const router = useRouter();

  const handleConnect = async () => {
    const ok = await login(name);
    if (ok) {
      router.push("/dashboard");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold">Connect your Wallet</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-col items-center gap-3 w-72">
        <WalletMultiButton />
        {connected && (
          <>
            <input
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 placeholder-zinc-500 focus:outline-none"
              placeholder="Display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? "Signing in…" : "Sign In with Wallet"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
