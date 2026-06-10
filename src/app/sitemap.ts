import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

function getSiteUrl(): string {
  const fallback = "https://phao.dev";
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!envUrl) return fallback;

  try {
    return new URL(envUrl).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/v1`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/v1/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/v1/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/v1/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/v1/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/v1/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/v1/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [posts, projects] = await Promise.all([
      prisma.post.findMany({
        where: { published: true, status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.project.findMany({
        select: { number: true, updatedAt: true },
      }),
    ]);

    const postRoutes = posts.map((post) => ({
      url: `${siteUrl}/v1/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const projectRoutes = projects.map((project) => ({
      url: `${siteUrl}/v1/projects/${project.number}`,
      lastModified: project.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...postRoutes, ...projectRoutes];
  } catch {
    return staticRoutes;
  }
}
