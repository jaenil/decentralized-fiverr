"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkerAuth } from "@/hooks/useWorkerAuth";
import { useBalance } from "@/contexts/BalanceContext";

export default function WorkerNavbar() {
  const { logout } = useWorkerAuth();
  const { pendingSol, balanceError } = useBalance(); // shared context, no extra fetch
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <Link href="/task" className="text-lg font-bold text-white">
        dFiverr{" "}
        <span className="text-violet-400 text-sm font-normal">Worker</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400">
          Pending:{" "}
          {balanceError ? (
            <span className="text-red-400 text-xs" title={balanceError}>⚠ error</span>
          ) : (
            <span className="text-violet-300 font-semibold">{pendingSol} SOL</span>
          )}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          Disconnect
        </button>
      </div>
    </nav>
  );
}
