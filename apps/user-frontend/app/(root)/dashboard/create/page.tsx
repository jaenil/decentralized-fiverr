"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import ImageUploader from "@/components/ImageUploader";

export default function CreateTaskPage() {
  const router = useRouter();
  const { submitTask, loading, error } = useTasks();

  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taskId = await submitTask({ files, title, signature });
      router.push(`/dashboard/task/${taskId}`);
    } catch {
      // error already set by hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Create a Task</h1>

      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Task title */}
        <div className="flex flex-col gap-2">
          <label htmlFor="task-title" className="text-sm text-zinc-400">
            Title (optional)
          </label>
          <input
            className="rounded-lg bg-zinc-800 px-4 py-2 placeholder-zinc-500 focus:outline-none"
            id="task-title"
            placeholder="Select the most clickable thumbnail"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Solana tx signature */}
        <div className="flex flex-col gap-2">
          <label htmlFor="task-signature" className="text-sm text-zinc-400">
            Solana Transaction Signature
          </label>
          <input
            className="rounded-lg bg-zinc-800 px-4 py-2 placeholder-zinc-500 focus:outline-none font-mono text-sm"
            id="task-signature"
            placeholder="Paste your confirmed tx signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            required
          />
        </div>

        {/* Image options upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-zinc-400">
            Thumbnail Options (min 2)
          </label>
          <ImageUploader files={files} onChange={setFiles} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 py-3 font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {loading ? "Uploading & Creating…" : "Create Task"}
        </button>
      </form>
    </div>
  );
}
