"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import WorkerNavbar from "@/components/WorkerNavbar";
import { BalanceProvider } from "@/contexts/BalanceContext";
import Spinner from "@/components/Spinner";

export default function TaskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only after mount do we know localStorage state (avoids SSR mismatch)
    if (!isLoggedIn()) {
      router.replace("/login");
    } else {
      setMounted(true);
    }
  }, [router]);

  // Show spinner instead of leaking layout to unauthenticated users (fixes issue #8)
  if (!mounted) return <Spinner />;

  return (
    <BalanceProvider>
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <WorkerNavbar />
        <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      </div>
    </BalanceProvider>
  );
}
