"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isLoggedIn() ? "/task" : "/login");
  }, [router]);

  // Return null — no content flash, instant redirect
  return null;
}
