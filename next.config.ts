import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  distDir: isDev ? ".next-dev" : ".next",
  experimental: {
    viewTransition: true,
  },
  outputFileTracingExcludes: {
    "/*": [
      ".env*",
      "compose.runner.yml",
      "docker-compose*.yml",
      "docs/**/*",
      "nginx/**/*",
      "skills-lock.json",
      "src/**/*.test.ts",
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/v1/assets/projects/:path*",
        destination: "/projects/:path*",
      },
    ];
  },
};

export default nextConfig;
