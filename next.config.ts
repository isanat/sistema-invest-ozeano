import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Skip static generation for pages that can't be prerendered
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
