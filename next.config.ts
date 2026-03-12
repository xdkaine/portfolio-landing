import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: isDev ? ".next-dev" : ".next",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
