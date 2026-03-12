import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { posts as staticPosts } from "@/data/posts";
import { projects as staticProjects } from "@/data/projects";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [posts, projects] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.project.findMany({
        select: { number: true, updatedAt: true },
      }),
    ]);

    const postRoutes = posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const projectRoutes = projects.map((project) => ({
      url: `${siteUrl}/projects/${project.number}`,
      lastModified: project.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...postRoutes, ...projectRoutes];
  } catch {
    const fallbackPostRoutes = staticPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const fallbackProjectRoutes = staticProjects.map((project) => ({
      url: `${siteUrl}/projects/${project.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...fallbackPostRoutes, ...fallbackProjectRoutes];
  }
}

