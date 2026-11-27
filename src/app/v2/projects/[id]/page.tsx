import { projectCover, projectGalleryImages } from "@/lib/projectMedia";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Fragment } from "react";
import { PublicLink, PublicSharedElement, PublicTransitionSurface } from "@/components/v2/PublicTransition";
import { ScrollReveal } from "@/components/v2/ScrollReveal";
import { PostDocumentBody, LegacyPostBody } from "@/components/v2/blog/PostBody";
import { ImageCarousel } from "@/components/v2/ImageCarousel";
import { ZoomableImage } from "@/components/v2/ui/ZoomableImage";
import {
  isSafeProjectExternalUrl,
  mergeProjectCaseStudy,
  transformProjectMarkdownUrl,
  type ProjectCaseStudyViewModel,
} from "@/lib/projectCaseStudy";
import {
  getProjectByIdOrNumber,
  listProjectNavigation,
} from "@/lib/projectCatalog";
import {
  normalizeProjectStatus,
  getProjectActions,
  type DisplayProjectStatus,
} from "@/lib/projectPresentation";
import { PORTFOLIO_NAME } from "@/lib/v2/siteMetadata";
import { projectSocialPreview, socialCardMetadata, SOCIAL_SITE_NAME } from "@/lib/v2/socialPreview";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const loadProject = cache(async (id: string) => {
  try {
    return await getProjectByIdOrNumber(id);
  } catch {
    return null;
  }
});
const loadSiteSettings = cache(getSiteSettings);

interface NormalizedProject {
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  url?: string | null;
  github?: string | null;
  status: DisplayProjectStatus;
}

function createFallbackWriteup(description: string): string[] {
  const trimmed = description.trim();
  return [trimmed || "Write-up coming soon."];
}

function createBaseCaseStudy(project: NormalizedProject): ProjectCaseStudyViewModel {
  return {
    subtitle: project.description,
    role: "",
    timeline: "",
    writeupMarkdown: createFallbackWriteup(project.description).join("\n\n"),
    writeup: createFallbackWriteup(project.description),
    highlights: [],
    gallery: [],
  };
}

function getStatusClass(status: DisplayProjectStatus): string {
  if (status === "LIVE") {
    return "text-status-live border-status-live/30";
  }
  if (status === "IN PROGRESS") {
    return "text-status-progress border-status-progress/30";
  }
  return "text-steel border-iron";
}

function normalizeProject(
  project: NonNullable<Awaited<ReturnType<typeof getProjectByIdOrNumber>>>,
): NormalizedProject {
  return {
    id: project.id,
    number: project.number,
    title: project.title,
    description: project.description,
    tags: project.tags,
    year: project.year,
    url:
      project.url && isSafeProjectExternalUrl(project.url)
        ? project.url
        : null,
    github:
      project.github && isSafeProjectExternalUrl(project.github)
        ? project.github
        : null,
    status: normalizeProjectStatus(project.status),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [project, settings] = await Promise.all([
    loadProject(id),
    loadSiteSettings(),
  ]);
  if (!project) return {};

  const preview = projectSocialPreview(project);
  const title = `${preview.title} | Projects | ${PORTFOLIO_NAME}`;
  const canonical = `/v2/projects/${encodeURIComponent(project.number)}`;
  const socialImage = socialCardMetadata(canonical, preview);

  return {
    title: { absolute: title },
    description: preview.description,
    authors: [{ name: settings.siteName }],
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: preview.title,
      description: preview.description,
      url: canonical,
      siteName: SOCIAL_SITE_NAME,
      authors: [settings.siteName],
      section: "Projects",
      tags: project.tags,
      images: [socialImage.animated],
    },
    twitter: {
      card: "summary_large_image",
      title: preview.title,
      description: preview.description,
      images: [socialImage.staticImage],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [settings, project] = await Promise.all([
    loadSiteSettings(),
    loadProject(id),
  ]);

  if (!project) notFound();

  const normalizedProject = normalizeProject(project);

  const mergedDeepDive = mergeProjectCaseStudy(
    createBaseCaseStudy(normalizedProject),
    project.caseStudy,
  );
  const writeupMarkdown =
    mergedDeepDive.writeupMarkdown.trim() ||
    mergedDeepDive.writeup.join("\n\n");

  const demoUrl = normalizedProject.url ?? mergedDeepDive.demoUrl;
  const repoUrl = normalizedProject.github ?? mergedDeepDive.repoUrl;
  const projectActions = getProjectActions(demoUrl, repoUrl);
  const hasDemoSection = Boolean(mergedDeepDive.demoSummary);

  let projectOrder: { number: string }[] = [];
  try {
    projectOrder = await listProjectNavigation();
  } catch {
    projectOrder = [];
  }

  const currentIndex = projectOrder.findIndex(
    (entry) => entry.number === normalizedProject.number,
  );
  const previousProject = currentIndex > 0 ? projectOrder[currentIndex - 1] : null;
  const nextProject =
    currentIndex >= 0 && currentIndex < projectOrder.length - 1
      ? projectOrder[currentIndex + 1]
      : null;

  const images = projectGalleryImages(mergedDeepDive).map(image => ({ src: image.image, alt: image.alt || image.title || normalizedProject.title, caption: image.caption || image.title }));
  const coverImage = projectCover(mergedDeepDive);
  const cover = coverImage ? { src: coverImage.image, alt: coverImage.alt || normalizedProject.title, caption: coverImage.caption || coverImage.title } : undefined;
  return (
    <PublicTransitionSurface>
      <div className="project-detail mx-auto max-w-[1800px] px-6 md:px-12 lg:px-24">
        <header className="pt-28 pb-9 md:pt-32">
          <ScrollReveal variant="row"><div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-steel"><PublicLink href="/v2" intent="section">{settings.siteName}</PublicLink><span>/</span><PublicLink href="/v2/projects" intent="drill-out">Projects</PublicLink><span>/</span><PublicSharedElement kind="project-marker" itemKey={normalizedProject.number}><span className="text-ember">{normalizedProject.number}</span></PublicSharedElement></div></ScrollReveal>
          <div className={`grid items-center gap-8 lg:gap-12 ${cover ? "lg:grid-cols-2" : ""}`}>
            <div className="min-w-0">
              <ScrollReveal variant="block"><div className="mb-5 flex flex-wrap items-center gap-4"><span className={`border px-3 py-1 text-xs ${getStatusClass(normalizedProject.status)}`}>{normalizedProject.status}</span><span className="text-xs text-steel">{normalizedProject.year}</span>{mergedDeepDive.role ? <span className="text-xs text-ash">{mergedDeepDive.role}</span> : null}{mergedDeepDive.timeline ? <span className="text-xs text-ash">{mergedDeepDive.timeline}</span> : null}</div></ScrollReveal>
              <ScrollReveal delay={0.05} variant="headline"><PublicSharedElement kind="project-title" itemKey={normalizedProject.number}><h1 className="font-display text-[clamp(2.75rem,4.3vw,5.6rem)] leading-[1.06] tracking-tighter [overflow-wrap:anywhere]" tabIndex={-1}>{normalizedProject.title.split(/(?=\.)/).map((part, index) => <Fragment key={index}><span className="inline-block max-w-full align-baseline">{part}</span><wbr /></Fragment>)}</h1></PublicSharedElement></ScrollReveal>
              <ScrollReveal delay={0.1}><p className="mt-5 max-w-3xl text-base leading-relaxed text-ash">{mergedDeepDive.subtitle || normalizedProject.description}</p>
                {projectActions.length ? <div className="mt-5 flex flex-wrap gap-3">{projectActions.map(action => <a key={action.href} href={action.href} target="_blank" rel="noopener noreferrer" className="post-action">{action.label} ↗</a>)}</div> : null}
                <div className="mt-5 flex flex-wrap gap-2">{normalizedProject.tags.map(tag => <span key={tag} className="border border-iron px-2 py-1 text-xs text-ash">{tag}</span>)}</div>
              </ScrollReveal>
            </div>
            {cover ? <ScrollReveal variant="media" delay={0.1}><figure><div className="overflow-hidden border border-iron bg-surface"><ZoomableImage src={cover.src} alt={cover.alt} gallery={images.map(image => ({ image: image.src, alt: image.alt }))} /></div>{cover.caption ? <figcaption className="mt-3 text-xs leading-relaxed text-steel">{cover.caption}</figcaption> : null}</figure></ScrollReveal> : null}
          </div>
        </header>
        <section className="border-t border-iron py-10 md:py-14" aria-label="Project story">
          {mergedDeepDive.bodyJson ? <PostDocumentBody document={mergedDeepDive.bodyJson} story reveal /> : <div className={`grid items-start gap-8 lg:gap-12 ${images.length > 1 ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : ""}`}>
            <div className="min-w-0"><LegacyPostBody content={writeupMarkdown} story reveal urlTransform={transformProjectMarkdownUrl} /></div>
            {images.length > 1 ? <div className="min-w-0 lg:sticky lg:top-24"><ScrollReveal variant="media"><ImageCarousel images={images.slice(1)} /></ScrollReveal></div> : null}
          </div>}
          {mergedDeepDive.highlights.length ? <ScrollReveal><div className="mt-10 border-y border-iron py-6"><h2 className="mb-4 font-display text-3xl">Highlights</h2><ul className="grid gap-3 text-sm leading-relaxed text-ash md:grid-cols-2">{mergedDeepDive.highlights.map(item => <li key={item}>— {item}</li>)}</ul></div></ScrollReveal> : null}
          {(mergedDeepDive.challenge || mergedDeepDive.concept) ? <div className="mt-10 grid gap-8 md:grid-cols-2">{[["Challenge", mergedDeepDive.challenge], ["Concept", mergedDeepDive.concept]].map(([label, text]) => text ? <ScrollReveal key={label}><section><h2 className="mb-4 font-display text-3xl">{label}</h2><p className="text-base leading-relaxed text-ash">{text}</p></section></ScrollReveal> : null)}</div> : null}
          {hasDemoSection ? <ScrollReveal><section className="mt-10 border-t border-iron pt-8"><h2 className="mb-4 font-display text-3xl">Demo</h2><p className="max-w-3xl text-base leading-relaxed text-ash">{mergedDeepDive.demoSummary}</p></section></ScrollReveal> : null}
        </section>
        {mergedDeepDive.bodyJson && images.length > 1 ? <section className="border-t border-iron py-10"><ScrollReveal variant="headline"><h2 className="mb-5 font-display text-4xl">Project images</h2></ScrollReveal><ScrollReveal variant="media"><ImageCarousel images={images.slice(1)} /></ScrollReveal></section> : null}
        <ScrollReveal variant="row"><nav aria-label="Project navigation" className="flex flex-wrap items-center justify-between gap-5 border-t border-iron py-10 text-sm text-ash"><PublicLink href="/v2/projects" intent="drill-out">← All projects</PublicLink><div className="flex flex-wrap gap-6">{previousProject ? <PublicLink href={`/v2/projects/${previousProject.number}`} intent="sibling-prev">← Previous project</PublicLink> : null}{nextProject ? <PublicLink href={`/v2/projects/${nextProject.number}`} intent="sibling-next">Next project →</PublicLink> : null}</div></nav></ScrollReveal>
      </div>
    </PublicTransitionSurface>
  );
}
