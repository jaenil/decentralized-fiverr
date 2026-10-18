"use client";
import { useContext } from "react";
import { WorkerAuthContext } from "@/contexts/WorkerAuthContext";
export function useWorkerAuth() {
  const value = useContext(WorkerAuthContext);
  if (!value) throw new Error("useWorkerAuth requires WorkerAuthProvider");
  return value;
}
