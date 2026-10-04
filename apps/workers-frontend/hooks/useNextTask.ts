"use client";

import { useState, useCallback, useRef } from "react";
import type { AxiosError } from "axios";
import type { WorkerTask } from "@/lib/api";
import { getNextTask, submitOption } from "@/lib/api";

export function useNextTask() {
  const [task, setTask] = useState<WorkerTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // synchronous guard (fixes issue #9)
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const { task } = await getNextTask();
      setTask(task);
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      // Primary signal: 404 status (fixes issue #2)
      if (ax?.response?.status === 404) {
        setDone(true);
        setTask(null);
      } else {
        setError(ax?.response?.data?.message ?? "Failed to load task");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(
    async (optionId: number) => {
      if (!task) return;
      // Synchronous guard prevents double-submit before re-render (fixes issue #9)
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const result = await submitOption(task.id, optionId);
        if (result.nextTask) {
          setTask(result.nextTask);
        } else {
          setDone(true);
          setTask(null);
        }
      } catch {
        setError("Submission failed. Please try again.");
      } finally {
        setSubmitting(false);
        submittingRef.current = false;
      }
    },
    [task]
  );

  return { task, loading, submitting, done, error, fetchNextTask, submit };
}
