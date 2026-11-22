import HomePageClient from "@/components/HomePageClient";
import { listPublishedPosts } from "@/lib/postEditorial";
import { listProjects } from "@/lib/projectCatalog";
import { getSiteSettings } from "@/lib/siteSettings";
import { pickPublicSiteSettings } from "@/lib/siteSettings-schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [settings, projects, posts] = await Promise.all([
    getSiteSettings(),
    listProjects(),
    listPublishedPosts({ limit: 4 }),
  ]);
  const featured = projects.filter((project) => project.featured);
  const selectedProjects = (featured.length > 0 ? featured : projects).slice(0, 4);

  return (
    <HomePageClient
      siteSettings={pickPublicSiteSettings(settings)}
      projects={selectedProjects.map((project) => ({
        id: project.id,
        number: project.number,
        title: project.title,
        description: project.description,
        tags: project.tags,
        status: project.status,
        featured: project.featured,
      }))}
      posts={posts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        date: post.date,
        readTime: post.readTime,
        tags: post.tags,
      }))}
    />
  );
}
