"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import TaskResults from "@/components/TaskResults";
import type { TaskResultsResponse } from "@repo/types";

export default function TaskResultsPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { fetchResults, loading, error } = useTasks();
  const [data, setData] = useState<TaskResultsResponse | null>(null);

  useEffect(() => {
    if (!taskId) return;
    fetchResults(Number(taskId)).then(setData).catch(() => {});
  }, [taskId, fetchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400 animate-pulse">Loading results…</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Task #{data.taskId} Results</h1>
      <TaskResults options={data.options} />
    </div>
  );
}
