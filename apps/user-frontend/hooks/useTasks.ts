"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  getPreSignedUrl,
  uploadToS3,
  createTask,
  getTaskResults,
} from "@/lib/api";
import { loadToken } from "@/lib/auth";
import { imageValidation } from "@/lib/task-input";
import type { TaskResultsResponse } from "@repo/types";

export function useTasks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<number> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const cancel = () => {
      generation.current += 1;
      controller.current?.abort();
    };
    const storage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "df_token" ||
        event.key === "df_address"
      )
        cancel();
    };
    window.addEventListener("df:session-changed", cancel);
    window.addEventListener("df:session-expired", cancel);
    window.addEventListener("storage", storage);
    return () => {
      mounted.current = false;
      cancel();
      window.removeEventListener("df:session-changed", cancel);
      window.removeEventListener("df:session-expired", cancel);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const uploadImage = useCallback(
    async (file: File, signal?: AbortSignal): Promise<string> => {
      const { url } = await getPreSignedUrl(signal);
      await uploadToS3(url, file, signal);
      const source = new URL(url);
      const cloudfront = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      return cloudfront
        ? `${cloudfront.replace(/\/$/, "")}${source.pathname}`
        : url.split("?")[0];
    },
    [],
  );

  const submitTask = useCallback(
    (opts: {
      files: File[];
      title?: string;
      signature: string;
    }): Promise<number> => {
      if (inFlight.current) return inFlight.current;
      const attempt = ++generation.current;
      const token = loadToken();
      const address = localStorage.getItem("df_address");
      const abort = new AbortController();
      controller.current = abort;
      const assertCurrent = () => {
        if (
          !mounted.current ||
          generation.current !== attempt ||
          token !== loadToken() ||
          address !== localStorage.getItem("df_address")
        ) {
          abort.abort();
          throw new Error(
            "Task creation cancelled because the session changed.",
          );
        }
      };
      const run = async () => {
        setLoading(true);
        setError(null);
        try {
          if (opts.files.length < 2)
            throw new Error("Upload at least 2 images.");
          const problem = imageValidation(opts.files);
          if (problem) throw new Error(problem);
          if (!opts.signature.trim())
            throw new Error("Transaction signature required.");
          const imageUrls = await Promise.all(
            opts.files.map((file) => uploadImage(file, abort.signal)),
          );
          assertCurrent();
          const { id } = await createTask(
            {
              title: opts.title,
              signature: opts.signature,
              options: imageUrls.map((imageUrl) => ({ imageUrl })),
            },
            abort.signal,
          );
          assertCurrent();
          return id;
        } catch (cause) {
          abort.abort();
          if (mounted.current)
            setError(
              cause instanceof Error ? cause.message : "Failed to create task",
            );
          throw cause;
        } finally {
          if (mounted.current) setLoading(false);
        }
      };
      inFlight.current = run().finally(() => {
        inFlight.current = null;
      });
      return inFlight.current;
    },
    [uploadImage],
  );

  const fetchResults = useCallback(
    async (taskId: number): Promise<TaskResultsResponse> => {
      setLoading(true);
      setError(null);
      try {
        return await getTaskResults(taskId);
      } catch (cause) {
        if (mounted.current)
          setError(
            cause instanceof Error ? cause.message : "Failed to fetch results",
          );
        throw cause;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [],
  );
  return { loading, error, uploadImage, submitTask, fetchResults };
}
