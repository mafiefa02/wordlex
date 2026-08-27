import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The UI package ships TypeScript source rather than a build step.
  transpilePackages: ["@wordlex/ui"],
};

export default nextConfig;
