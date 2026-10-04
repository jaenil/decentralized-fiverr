"use client";

import { useRef } from "react";
import Image from "next/image";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

export default function ImageUploader({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    onChange([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop Zone */}
      <div
        className="rounded-xl border-2 border-dashed border-zinc-700 p-8 text-center cursor-pointer hover:border-indigo-500 transition"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-zinc-400">
          Drag & drop images here, or{" "}
          <span className="text-indigo-400 underline">click to browse</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {files.map((file, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden aspect-video bg-zinc-800">
              <Image
                src={URL.createObjectURL(file)}
                alt={`Option ${i + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
