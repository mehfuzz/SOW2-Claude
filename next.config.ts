import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "pdf-parse", "mammoth"],
};

export default nextConfig;
