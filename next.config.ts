import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "output: standalone" is NOT compatible with "next start" in Next.js 16.
  // For Coolify/Docker deployment, we use "next start" directly without standalone.
  // Standalone is only needed for minimal Docker images, which we don't need here.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
