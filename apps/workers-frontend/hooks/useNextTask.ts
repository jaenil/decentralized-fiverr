"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { AxiosError } from "axios";
import type { WorkerTask, TaskOption } from "@/lib/api";
import { getNextTask, submitOption } from "@/lib/api";
export interface SubmittedTask {
  task: WorkerTask;
  option: TaskOption;
  submissionId: number;
}
const noRefresh = async () => {};
export function useNextTask(onSubmitted: () => Promise<void> = noRefresh) {
  const [submission, setSubmission] = useState<SubmittedTask | null>(null);
  const submittedRef = useRef(false);
  const fetchingRef = useRef(false);
  const [task, setTask] = useState<WorkerTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  const fetchNextTask = useCallback(async () => {
    if (submittingRef.current || (submittedRef.current && fetchingRef.current))
      return;
    fetchingRef.current = true;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const response = await getNextTask();
      if (request === generation.current) {
        setTask(response.task);
        setSubmission(null);
        submittedRef.current = false;
      }
    } catch (cause) {
      if (request !== generation.current) return;
      const error = cause as AxiosError<{ message?: string }>;
      if (error.response?.status === 404) {
        setSubmission(null);
        submittedRef.current = false;
        setDone(true);
        setTask(null);
      } else setError(error.response?.data?.message ?? "Failed to load task");
    } finally {
      if (request === generation.current) {
        fetchingRef.current = false;
        setLoading(false);
      }
    }
  }, []);
  const submit = useCallback(
    async (optionId: number) => {
      if (!task || submittingRef.current || submittedRef.current) return;
      const option = task.options.find(
        (candidate) => candidate.id === optionId,
      );
      if (!option) return;
      submittingRef.current = true;
      fetchingRef.current = false;
      const request = ++generation.current;
      setSubmitting(true);
      setError(null);
      setLoading(false);
      try {
        const result = await submitOption(task.id, optionId);
        if (request !== generation.current) return;
        submittedRef.current = true;
        setSubmission({ task, option, submissionId: result.submissionId });
        setTask(null);
        setDone(false);
        // Ignore the legacy inline nextTask: only an explicit GET advances the UI.
        // A balance error cannot turn an accepted vote into a failed submission.
        void Promise.resolve()
          .then(onSubmitted)
          .catch(() => {});
      } catch {
        if (request === generation.current)
          setError("Submission failed. Please try again.");
      } finally {
        submittingRef.current = false;
        if (request === generation.current) setSubmitting(false);
      }
    },
    [task, onSubmitted],
  );
  return {
    task,
    submission,
    loading,
    submitting,
    done,
    error,
    fetchNextTask,
    submit,
  };
}
