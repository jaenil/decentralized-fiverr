"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { getTaskResults } from "@/lib/api";
import { parseTaskId } from "@/lib/task-input";
import TaskResults from "@/components/TaskResults";
import type { TaskResultsResponse } from "@repo/types";

export default function TaskResultsPage() {
  const { taskId: rawId } = useParams<{ taskId: string }>();
  const taskId = parseTaskId(rawId ?? "");
  const [data, setData] = useState<TaskResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (taskId === null) return;
    const current = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getTaskResults(taskId);
      if (current === request.current) setData(result);
    } catch (cause) {
      if (current === request.current) {
        const detail = axios.isAxiosError(cause)
          ? cause.response?.data?.message
          : undefined;
        setError(
          typeof detail === "string"
            ? detail
            : cause instanceof Error
              ? cause.message
              : "Could not load results.",
        );
      }
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [taskId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the external resource when the route changes
    void refresh();
    return () => {
      request.current += 1;
    };
  }, [refresh]);
  if (taskId === null)
    return <p role="alert">Invalid task ID. Enter a positive whole number.</p>;
  const currentData = data?.taskId === taskId ? data : null;
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <h1 className="text-3xl font-bold">Task #{taskId} Results</h1>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded bg-indigo-600 px-4 py-2 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      {loading && (
        <p role="status">
          {currentData ? "Refreshing results…" : "Loading results…"}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      {currentData && <TaskResults options={currentData.options} />}
    </div>
  );
}
