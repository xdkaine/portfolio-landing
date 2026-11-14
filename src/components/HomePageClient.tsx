"use client";

import Image from "next/image";
import { useState } from "react";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { PublicLink, PublicSharedElement } from "@/components/PublicTransition";
import { PORTFOLIO_NAME, PORTFOLIO_TITLE } from "@/lib/siteMetadata";
import { PORTFOLIO_PROFILE } from "@/lib/portfolioProfile";
import { parseBrandAliases } from "@/lib/brandAliases";
import type { PublicSiteSettings } from "@/lib/siteSettings-schema";
import type { DisplayProjectStatus } from "@/lib/projectPresentation";
import { ProjectStatus } from "@/components/ProjectStatus";

interface HomeProject {
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  status: DisplayProjectStatus;
  image?: { src: string; alt: string; caption: string };
}

interface HomePost {
  id: string;
  slug: string;
  title: string;
  date: string;
  readTime: string;
}

function ProjectCard({ project }: { project: HomeProject }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const image = imageUnavailable ? undefined : project.image;
  return (
    <PublicLink href={`/v1/projects/${project.number}`} intent="drill-in" className="group block border-b border-iron py-9 md:py-12" aria-label={`Read ${project.title} case study`}>
      <article className={`grid gap-7 md:gap-10 ${image ? "lg:grid-cols-2 lg:items-center" : "lg:grid-cols-[1fr_1.15fr]"}`}>
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-4 text-xs text-steel">
            <PublicSharedElement kind="project-marker" itemKey={project.number}>
              <span className="tabular-nums">{project.number.padStart(2, "0")}</span>
            </PublicSharedElement>
            <ProjectStatus status={project.status} />
          </div>
          <PublicSharedElement kind="project-title" itemKey={project.number}>
            <h3 className="font-display text-3xl leading-[1.12] tracking-tight text-bone transition-colors group-hover:text-ember md:text-4xl [overflow-wrap:anywhere]">{project.title}</h3>
          </PublicSharedElement>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ash" data-project-teaser>{project.description}</p>
          {project.tags.length > 0 ? <p className="mt-5 text-xs leading-relaxed text-steel">{project.tags.slice(0, 4).join(" · ")}</p> : null}
          <span className="mt-6 inline-flex min-h-10 items-center gap-3 text-sm text-bone underline decoration-iron underline-offset-4 transition-colors group-hover:text-ember">Read case study <span aria-hidden="true">↗</span></span>
        </div>
        {image ? (
          <figure className="min-w-0">
            <div className="overflow-hidden border border-iron bg-surface">
              <Image src={image.src} alt={image.alt} width={1600} height={1000} unoptimized onError={() => setImageUnavailable(true)} className="aspect-[16/10] w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.015]" />
            </div>
            {image.caption ? <figcaption className="mt-3 text-xs leading-relaxed text-steel">{image.caption}</figcaption> : null}
          </figure>
        ) : null}
      </article>
    </PublicLink>
  );
}

export default function HomePageClient({ siteSettings, projects, posts }: {
  siteSettings: PublicSiteSettings;
  projects: HomeProject[];
  posts: HomePost[];
}) {
  const brandAliases = parseBrandAliases(siteSettings.siteAliases);

  return (
    <>
      <TitleTypewriter brandName={siteSettings.siteName} brandAliases={brandAliases} />
      <header className="px-6 pb-16 pt-32 md:px-12 md:pb-20 md:pt-40 lg:px-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iron pb-5 text-xs tracking-[0.08em] text-ash">
          <p>{PORTFOLIO_NAME}</p><p>{PORTFOLIO_PROFILE.location}</p>
        </div>
        <div className="grid items-end gap-6 pt-7 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-10">
          <h1 className="min-w-0 font-display text-[clamp(5rem,19vw,15rem)] leading-[1.08] tracking-tighter text-bone">
            <span className="sr-only">{PORTFOLIO_TITLE}</span>
            <span aria-hidden="true"><AliasTypewriter aliases={brandAliases.length ? brandAliases : [siteSettings.siteName]} cursorClassName="text-[0.22em]" /></span>
          </h1>
          <div className="max-w-xl pb-3">
            <p className="text-base leading-relaxed text-bone md:text-lg">I&apos;m {PORTFOLIO_NAME}, a systems engineer and developer. I build applications and the infrastructure they run on, and share the decisions and lessons behind that work here.</p>
            <p className="mt-4 text-sm leading-relaxed text-ash">I currently work as a {PORTFOLIO_PROFILE.currentRole}.</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
              <PublicLink href="/v1/projects" intent="section" className="inline-flex min-h-12 items-center gap-3 border border-ember bg-ember px-5 text-xs tracking-[0.08em] text-void transition-colors hover:border-bone hover:bg-bone">VIEW PROJECTS <span aria-hidden="true">↗</span></PublicLink>
              <PublicLink href="/v1/contact" intent="section" className="inline-flex min-h-12 items-center text-xs tracking-[0.08em] text-bone underline decoration-steel underline-offset-4 transition-colors hover:text-ember">CONTACT ME</PublicLink>
            </div>
          </div>
        </div>
      </header>

      <section className="border-t border-iron px-6 py-12 md:px-12 md:py-16 lg:px-24" aria-labelledby="selected-work">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-bone pb-5">
          <h2 id="selected-work" className="font-display text-4xl tracking-tight md:text-6xl">SELECTED WORK</h2>
          <PublicLink href="/v1/projects" intent="section" className="inline-flex min-h-10 items-center gap-2 text-sm text-ash underline underline-offset-4 hover:text-ember">All projects <span aria-hidden="true">↗</span></PublicLink>
        </div>
        {projects.length ? projects.map(project => <ProjectCard key={project.id} project={project} />) : <p className="py-10 text-base leading-relaxed text-ash">New project write-ups are on the way.</p>}
      </section>

      <section className="grid gap-7 border-y border-iron px-6 py-14 md:px-12 md:py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-24" aria-labelledby="behind-projects">
        <h2 id="behind-projects" className="font-display text-4xl leading-tight tracking-tight md:text-5xl">BEHIND THE PROJECTS</h2>
        <div className="max-w-2xl">
          <p className="font-editorial text-xl leading-relaxed text-bone md:text-2xl">{PORTFOLIO_PROFILE.personalNote}</p>
          <PublicLink href="/v1/about" intent="section" className="mt-6 inline-flex min-h-10 items-center gap-3 text-sm text-ash underline underline-offset-4 hover:text-ember">More about me <span aria-hidden="true">↗</span></PublicLink>
        </div>
      </section>

      <section className="px-6 py-14 md:px-12 md:py-20 lg:px-24" aria-labelledby="recent-writing">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-bone pb-5">
          <h2 id="recent-writing" className="font-display text-4xl tracking-tight md:text-5xl">FROM THE BLOG</h2>
          <PublicLink href="/v1/blog" intent="section" className="inline-flex min-h-10 items-center gap-2 text-sm text-ash underline underline-offset-4 hover:text-ember">All posts <span aria-hidden="true">↗</span></PublicLink>
        </div>
        {posts.length ? posts.map(post => (
          <PublicLink key={post.id} href={`/v1/blog/${post.slug}`} intent="drill-in" className="group grid gap-3 border-b border-iron py-7 md:grid-cols-[140px_1fr_auto] md:items-baseline md:gap-8">
            <span className="text-xs text-steel">{post.date}</span>
            <PublicSharedElement kind="post-title" itemKey={post.slug}><h3 className="font-display text-2xl leading-tight tracking-tight group-hover:text-ember md:text-3xl">{post.title}</h3></PublicSharedElement>
            <span className="flex items-center gap-5 text-xs text-ash">{post.readTime}<span aria-hidden="true">↗</span></span>
          </PublicLink>
        )) : <p className="py-8 text-base text-ash">New notes from the build are on the way.</p>}
      </section>
    </>
  );
}
