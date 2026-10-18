"use client";

import TaskImage from "./TaskImage";
import type { WorkerTask } from "@/lib/api";

interface TaskCardProps {
  task: WorkerTask;
  submitting: boolean;
  onVote: (optionId: number) => void;
}

export default function TaskCard({ task, submitting, onVote }: TaskCardProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
      <p className="text-zinc-400 mb-8 text-sm">
        Click the image that best fits the task. You earn ~0.01 SOL per
        submission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {task.options.map((option) => (
          <button
            key={option.id}
            aria-label={`Select option ${option.id}`}
            disabled={submitting}
            onClick={() => onVote(option.id)}
            className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-zinc-700
                       hover:border-violet-500 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-800"
          >
            <TaskImage url={option.image_url} optionId={option.id} />
            <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/20 transition-colors duration-200 flex items-end justify-center pb-4">
              <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-violet-700/80 px-4 py-1 rounded-full text-sm">
                {submitting ? "Submitting…" : "Select"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
