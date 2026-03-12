import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const fallback = "http://localhost:3000";
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!envUrl) return fallback;

  try {
    return new URL(envUrl).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/api/"],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`],
  };
}

