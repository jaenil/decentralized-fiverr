"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { imageValidation } from "@/lib/task-input";
interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}
function Preview({
  file,
  index,
  remove,
}: {
  file: File;
  index: number;
  remove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize a browser-owned resource with its file
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="relative rounded-lg overflow-hidden aspect-video bg-zinc-800">
      {url && (
        <Image
          src={url}
          alt={`Option ${index + 1}`}
          fill
          unoptimized
          className="object-cover"
        />
      )}
      <button
        type="button"
        aria-label={`Remove option ${index + 1}`}
        onClick={remove}
        className="absolute top-1 right-1 rounded bg-black/80 p-2 text-white focus-visible:ring-2"
      >
        Remove
      </button>
    </div>
  );
}
export default function ImageUploader({ files, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    const problem = imageValidation(next);
    setError(problem);
    if (!problem) onChange(next);
  };
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border-2 border-dashed border-zinc-700 p-6"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <label htmlFor="thumbnail-options" className="block mb-2">
          Thumbnail options
        </label>
        <p id="image-help" className="text-sm text-zinc-400 mb-3">
          Choose or drop 2–10 PNG, JPEG, or WebP images. Maximum 5 MiB each.
        </p>
        <input
          id="thumbnail-options"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          aria-describedby="image-help"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
          className="max-w-full"
        />
      </div>
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {files.map((file, index) => (
          <Preview
            key={`${file.name}-${index}`}
            file={file}
            index={index}
            remove={() => {
              setError(null);
              onChange(files.filter((_, i) => i !== index));
            }}
          />
        ))}
      </div>
    </div>
  );
}
