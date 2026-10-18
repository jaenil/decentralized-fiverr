"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkerAuth } from "@/hooks/useWorkerAuth";
import WorkerNavbar from "@/components/WorkerNavbar";
import { BalanceProvider } from "@/contexts/BalanceContext";
import Spinner from "@/components/Spinner";

export default function TaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useWorkerAuth();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [router, status]);
  if (status !== "authenticated") return <Spinner />;

  return (
    <BalanceProvider>
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <WorkerNavbar />
        <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      </div>
    </BalanceProvider>
  );
}
