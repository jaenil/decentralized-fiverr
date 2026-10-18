"use client";

import Image from "next/image";
import { useState } from "react";
import { taskImageSource } from "@/lib/task-images";

export default function TaskImage({
  url,
  optionId,
}: {
  url: string;
  optionId: number;
}) {
  const source = taskImageSource(url);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!source || failedSource === source) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-zinc-400">
        <span>Image unavailable</span>
        <span className="text-sm">Option {optionId}</span>
      </div>
    );
  }
  return (
    <Image
      src={source}
      alt={`Option ${optionId}`}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 448px"
      className="object-cover"
      onError={() => setFailedSource(source)}
    />
  );
}
