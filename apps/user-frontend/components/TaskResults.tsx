"use client";

import Image from "next/image";
import type { OptionWithSubmissions } from "@repo/types";

interface Props {
  options: OptionWithSubmissions[];
}

function formatImageUrl(url: string): string {
  const cloudfront = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
  if (!cloudfront) return url;
  if (url.includes(".amazonaws.com/")) {
    const key = url.split(".amazonaws.com/")[1];
    return `${cloudfront.replace(/\/$/, "")}/${key}`;
  }
  return url;
}

export default function TaskResults({ options }: Props) {
  const total = options.reduce((s, o) => s + o.submissionCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {options.map((opt, i) => {
        const pct = total > 0 ? Math.round((opt.submissionCount / total) * 100) : 0;

        return (
          <div key={opt.id} className="flex gap-4 items-center">
            {/* Thumbnail preview */}
            <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
              <Image
                src={formatImageUrl(opt.image_url)}
                alt={`Option ${i + 1}`}
                fill
                className="object-cover"
              />
            </div>

            {/* Vote bar */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Option {i + 1}</span>
                <span className="font-semibold">{pct}% ({opt.submissionCount} votes)</span>
              </div>
              <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-zinc-500 text-sm">Total votes: {total}</p>
    </div>
  );
}
