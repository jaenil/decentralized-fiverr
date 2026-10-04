"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const router = useRouter();

  // ⚠️ In a real implementation, replace these with actual Solana wallet adapter
  // values (e.g., `useWallet()` from @solana/wallet-adapter-react).
  // For now, a text input simulates wallet address entry for development.
  const [walletId, setWalletId] = useState("");
  const [name,     setName]     = useState("");

  const handleConnect = async () => {
    await login(walletId, name);
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold">Connect your Wallet</h1>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex flex-col gap-3 w-72">
        <input
          className="rounded-lg bg-zinc-800 px-4 py-2 placeholder-zinc-500 focus:outline-none"
          placeholder="Wallet address (public key)"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
        />
        <input
          className="rounded-lg bg-zinc-800 px-4 py-2 placeholder-zinc-500 focus:outline-none"
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={handleConnect}
          disabled={loading || !walletId}
          className="rounded-xl bg-indigo-600 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {loading ? "Connecting…" : "Sign In"}
        </button>
      </div>
    </main>
  );
}
