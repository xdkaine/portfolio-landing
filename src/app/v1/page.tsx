import HomePageClient from "@/components/HomePageClient";
import { getProjectTeaser } from "@/lib/projectTeaser";
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
  const selectedProjects = (featured.length > 0 ? featured : projects).slice(0, 3);

  return (
    <HomePageClient
      siteSettings={pickPublicSiteSettings(settings)}
      projects={selectedProjects.map((project) => ({
        id: project.id,
        number: project.number,
        title: project.title,
        description: getProjectTeaser(project),
        tags: project.tags,
        status: project.status,
        image: project.caseStudy?.gallery?.[0] ? {
          src: project.caseStudy.gallery[0].image,
          alt: project.caseStudy.gallery[0].alt || project.title,
          caption: project.caseStudy.gallery[0].caption,
        } : undefined,
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
