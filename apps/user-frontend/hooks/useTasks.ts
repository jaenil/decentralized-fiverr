"use client";

import { useState, useCallback } from "react";
import {
  getPreSignedUrl,
  uploadToS3,
  createTask,
  getTaskResults,
} from "@/lib/api";
import type { TaskResultsResponse } from "@repo/types";

export function useTasks() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /** Upload a file to S3 and return its final URL */
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const { url } = await getPreSignedUrl();          // get pre-signed URL
    await uploadToS3(url, file);                      // PUT file directly to S3

    const s3Url = new URL(url);
    const cloudfront = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    if (cloudfront) {
      return `${cloudfront.replace(/\/$/, "")}${s3Url.pathname}`;
    }
    // Fallback: strip query string — the base URL is the permanent object URL
    return url.split("?")[0];
  }, []);

  /** Create a task; returns the new task ID */
  const submitTask = useCallback(
    async (opts: {
      files: File[];
      title?: string;
      signature: string;
    }): Promise<number> => {
      setLoading(true);
      setError(null);
      try {
        // Upload all images in parallel
        const imageUrls = await Promise.all(
          opts.files.map((f) => uploadImage(f))
        );
        const { id } = await createTask({
          title: opts.title,
          signature: opts.signature,
          options: imageUrls.map((url) => ({ imageUrl: url })),
        });
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to create task";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [uploadImage]
  );

  /** Fetch results for a task */
  const fetchResults = useCallback(
    async (taskId: number): Promise<TaskResultsResponse> => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTaskResults(taskId);
        // Derive submissionCount for convenience
        data.options = data.options.map((opt) => ({
          ...opt,
          submissionCount: opt.submissions.length,
        }));
        return data;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to fetch results";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, uploadImage, submitTask, fetchResults };
}
