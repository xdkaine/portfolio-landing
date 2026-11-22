import { getAboutContent } from "@/lib/aboutStore";
import { DEFAULT_ABOUT_CONTENT } from "@/lib/aboutContent";
import { projectCover } from "@/lib/projectMedia";
import HomePageClient from "@/components/v2/HomePageClient";
import { PublicTransitionSurface } from "@/components/v2/PublicTransition";
import { getProjectTeaser } from "@/lib/projectTeaser";
import { countPublishedPosts, listPublishedPosts } from "@/lib/postEditorial";
import { buildHomeStats } from "@/lib/homeStats";
import { listProjects } from "@/lib/projectCatalog";
import { getSiteSettings } from "@/lib/siteSettings";
import { pickPublicSiteSettings } from "@/lib/siteSettings-schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [settings, projects, posts, about, postCount] = await Promise.all([
    getSiteSettings(),
    listProjects(),
    listPublishedPosts({ limit: 4 }),
    getAboutContent().then(result => result.content).catch(() => DEFAULT_ABOUT_CONTENT),
    countPublishedPosts(),
  ]);
  const featured = projects.filter((project) => project.featured);
  const selectedProjects = (featured.length > 0 ? featured : projects).slice(0, 3);

  return (
    <PublicTransitionSurface>
      <HomePageClient
        siteSettings={pickPublicSiteSettings(settings)}
        stats={buildHomeStats(projects, postCount)}
        profile={{ currentRole: about.currentRole, personalNote: about.personalNote }}
        projects={selectedProjects.map((project) => { const cover = projectCover(project.caseStudy); return ({
          id: project.id,
          number: project.number,
          title: project.title,
          description: getProjectTeaser(project),
          tags: project.tags,
          status: project.status,
          image: cover ? {
            src: cover.image,
            alt: cover.alt || project.title,
            caption: cover.caption,
          } : undefined,
        }); })}
        posts={posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          date: post.date,
          readTime: post.readTime,
          tags: post.tags,
        }))}
      />
    </PublicTransitionSurface>
  );
}
