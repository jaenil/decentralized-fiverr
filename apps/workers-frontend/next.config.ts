import type { NextConfig } from "next";
import { taskImagePatterns } from "./lib/task-images";

const nextConfig: NextConfig = {
  distDir: process.env.WORKER_E2E === "1" ? ".next/e2e" : ".next",
  images: { remotePatterns: taskImagePatterns },
};
export default nextConfig;
