"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkerAuth } from "@/hooks/useWorkerAuth";

export default function LoginPage() {
  const { login, loading, error, isLoggedIn } = useWorkerAuth();
  const router = useRouter();
  const [walletId, setWalletId] = useState("");

  useEffect(() => {
    if (isLoggedIn) router.replace("/task");
  }, [isLoggedIn, router]);

  const handleConnect = async () => {
    if (!walletId.trim()) return;
    await login(walletId.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            dFiverr <span className="text-violet-400">Workers</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Connect your Solana wallet to start earning
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="Enter your Solana wallet address"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700
                         focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-600"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleConnect}
            disabled={loading || !walletId.trim()}
            className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold transition"
          >
            {loading ? "Connecting…" : "Connect & Start Earning"}
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Your wallet address is your identity. No password needed.
        </p>
      </div>
    </div>
  );
}
