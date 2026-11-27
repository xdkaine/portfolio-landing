import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  distDir: isDev ? ".next-dev" : ".next",
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
  async redirects() {
    // Keep shared admin, auth, API and media addresses at V1.
    const publicPaths = ["", "/projects/:path*", "/blog/:path*", "/about", "/contact", "/privacy", "/terms", "/feed.xml", "/opengraph-image"];
    return publicPaths.map(path => ({ source: `/v1${path}`, destination: `/v2${path}`, permanent: false }));
  },
  async rewrites() {
    return [
      { source: "/v2/:path*/opengraph-image.gif", destination: "/v2/:path*/opengraph-image" },
      { source: "/v1/assets/media/:path*", destination: "/media/:path*" },
      {
        source: "/v1/assets/projects/:path*",
        destination: "/projects/:path*",
      },
    ];
  },
};

export default nextConfig;
