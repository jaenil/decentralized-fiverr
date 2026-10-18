"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WalletMultiButton } from "@/components/WalletButton";

export default function Navbar() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-lg font-bold text-white">
        dFiverr
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/create"
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          + New Task
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          Disconnect
        </button>
        <WalletMultiButton />
      </div>
    </nav>
  );
}
