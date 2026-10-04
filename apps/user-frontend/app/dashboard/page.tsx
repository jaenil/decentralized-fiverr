"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Task card */}
        <Link
          href="/dashboard/create"
          className="rounded-2xl border border-zinc-700 p-6 hover:bg-zinc-800 transition flex flex-col gap-2"
        >
          <span className="text-2xl">🎨</span>
          <h2 className="text-xl font-semibold">New Task</h2>
          <p className="text-zinc-400 text-sm">
            Upload thumbnail options and let workers vote on the best one.
          </p>
        </Link>

        {/* View Results card (user enters a task ID) */}
        <div className="rounded-2xl border border-zinc-700 p-6 flex flex-col gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-semibold">View Results</h2>
          <TaskIdForm />
        </div>
      </div>
    </div>
  );
}

// Small inline form to navigate to a task results page
function TaskIdForm() {
  const [id, setId] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (id.trim()) {
          router.push(`/dashboard/task/${id.trim()}`);
        }
      }}
      className="flex gap-2 mt-2"
    >
      <input
        className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 placeholder-zinc-500 focus:outline-none"
        placeholder="Task ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500 transition"
      >
        Go
      </button>
    </form>
  );
}
