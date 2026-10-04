"use client";

import Image from "next/image";
import type { WorkerTask } from "@/lib/api";

interface TaskCardProps {
  task: WorkerTask;
  submitting: boolean;
  onVote: (optionId: number) => void;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return url.startsWith("/");
  }
}

export default function TaskCard({ task, submitting, onVote }: TaskCardProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
      <p className="text-zinc-400 mb-8 text-sm">
        Click the image that best fits the task. You earn ~0.01 SOL per submission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {task.options.map((option) => (
          <button
            key={option.id}
            disabled={submitting}
            onClick={() => onVote(option.id)}
            className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-zinc-700
                       hover:border-violet-500 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-800"
          >
            {isValidImageUrl(option.image_url) ? (
              <Image
                src={option.image_url}
                alt={`Option ${option.id}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/80 text-zinc-400 p-4 text-center">
                <svg
                  className="w-10 h-10 mb-2 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-zinc-300">
                  Option {option.id}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[200px] mt-1 font-mono">
                  {option.image_url}
                </span>
              </div>
            )}
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
