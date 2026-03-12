import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { projectDeepDives } from "@/data/projectDeepDives";
import {
  mergeProjectCaseStudy,
  parseProjectCaseStudy,
  projectCaseStudySettingKey,
} from "@/lib/projectCaseStudy";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/siteSettings";

type NormalizedStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";

interface NormalizedProject {
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  url?: string | null;
  github?: string | null;
  status: NormalizedStatus;
}

function normalizeStatus(status: string): NormalizedStatus {
  if (status === "IN_PROGRESS" || status === "IN PROGRESS") {
    return "IN PROGRESS";
  }
  if (status === "ARCHIVED") {
    return "ARCHIVED";
  }
  return "LIVE";
}

function createFallbackWriteup(description: string): string[] {
  return [
    description,
    "This project page is ready for a deeper case study. Add architecture decisions, tradeoffs, and implementation notes in `src/data/projectDeepDives.ts`.",
    "You can also attach custom gallery images in `public/projects` and reference them from the same data file to create a full narrative walkthrough.",
  ];
}

function getStatusClass(status: NormalizedStatus): string {
  if (status === "LIVE") {
    return "text-emerald-400 border-emerald-400/30";
  }
  if (status === "IN PROGRESS") {
    return "text-amber-400 border-amber-400/30";
  }
  return "text-steel border-iron";
}

export async function generateStaticParams() {
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, number: true },
    });

    return projects.flatMap((project) => [
      { id: project.id },
      { id: project.number },
    ]);
  } catch {
    return [];
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getSiteSettings();

  let project: {
    id: string;
    number: string;
    title: string;
    description: string;
    tags: string[];
    year: string;
    url: string | null;
    github: string | null;
    status: string;
  } | null = null;

  try {
    project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
        tags: true,
        year: true,
        url: true,
        github: true,
        status: true,
      },
    });

    // Also support `/projects/01` style routes.
    if (!project) {
      project = await prisma.project.findUnique({
        where: { number: id },
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          tags: true,
          year: true,
          url: true,
          github: true,
          status: true,
        },
      });
    }
  } catch {
    // DB not available.
  }

  if (!project) notFound();

  const normalizedProject: NormalizedProject = {
    id: project.id,
    number: project.number,
    title: project.title,
    description: project.description,
    tags: project.tags,
    year: project.year,
    url: project.url,
    github: project.github,
    status: normalizeStatus(project.status),
  };

  let editableCaseStudy = null;
  try {
    const caseStudySetting = await prisma.siteSetting.findUnique({
      where: { key: projectCaseStudySettingKey(normalizedProject.number) },
      select: { value: true },
    });
    editableCaseStudy = parseProjectCaseStudy(caseStudySetting?.value);
  } catch {
    editableCaseStudy = null;
  }

  const deepDive = projectDeepDives[normalizedProject.number] ?? {
    pitch: "Project case study in progress.",
    role: "Add role details",
    timeline: "Add timeline",
    challenge:
      "Document the core problem this project solves and why it matters.",
    concept:
      "Describe your concept and key technical/UX decisions here.",
    writeup: createFallbackWriteup(normalizedProject.description),
    highlights: ["Add highlight bullets in src/data/projectDeepDives.ts"],
    demoSummary:
      "Demo content can be linked with `demoUrl` in src/data/projectDeepDives.ts.",
    gallery: [
      {
        title: "CONCEPT",
        caption:
          "Replace with project-specific visual notes in src/data/projectDeepDives.ts.",
        image: "/projects/concept-frame.svg",
        alt: "Project concept placeholder",
      },
      {
        title: "SYSTEM",
        caption: "Add architecture diagrams or flow screenshots.",
        image: "/projects/system-flow.svg",
        alt: "Project system placeholder",
      },
      {
        title: "DEMO",
        caption: "Attach final UI captures or demo moments.",
        image: "/projects/demo-surface.svg",
        alt: "Project demo placeholder",
      },
    ],
  };

  const mergedDeepDive = mergeProjectCaseStudy(deepDive, editableCaseStudy);

  const demoUrl = normalizedProject.url ?? mergedDeepDive.demoUrl;
  const repoUrl = normalizedProject.github ?? mergedDeepDive.repoUrl;

  let projectOrder: { number: string }[] = [];
  try {
    projectOrder = await prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      select: { number: true },
    });
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

  return (
    <>
      <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <ScrollReveal>
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
            <Link href="/" className="hover:text-bone transition-colors">
              {settings.siteName}
            </Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-bone transition-colors">
              PROJECTS
            </Link>
            <span>/</span>
            <span className="text-ember">{normalizedProject.number}</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-10">
            <div className="max-w-4xl">
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tighter">
                {normalizedProject.title}
              </h1>
              <p className="text-bone/80 text-sm md:text-base leading-relaxed mt-6 max-w-3xl">
                {mergedDeepDive.pitch}
              </p>
            </div>
            <span
              className={`text-[10px] tracking-[0.15em] px-3 py-1 border shrink-0 mt-2 lg:mt-4 ${getStatusClass(normalizedProject.status)}`}
            >
              {normalizedProject.status}
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-3 mb-8">
            {normalizedProject.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] tracking-[0.12em] text-smoke border border-iron px-2 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-14 border-t border-iron">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10 lg:gap-14">
          <ScrollReveal>
            <div className="max-w-3xl">
              <span className="text-[10px] tracking-[0.3em] text-steel block mb-5">
                WRITE-UP//
              </span>
              <div className="space-y-5">
                {mergedDeepDive.writeup.map((paragraph, index) => (
                  <p
                    key={`${normalizedProject.number}-writeup-${index}`}
                    className="text-sm md:text-base leading-relaxed text-ash"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <aside className="border border-iron bg-surface/40 p-6 h-fit">
              <span className="text-[10px] tracking-[0.3em] text-steel block mb-6">
                SNAPSHOT//
              </span>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-iron tracking-[0.12em]">ROLE</span>
                  <span className="text-bone text-right">{mergedDeepDive.role}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-iron tracking-[0.12em]">TIMELINE</span>
                  <span className="text-bone text-right">
                    {mergedDeepDive.timeline}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-iron tracking-[0.12em]">YEAR</span>
                  <span className="text-bone text-right">
                    {normalizedProject.year}
                  </span>
                </div>
              </div>

              <div className="border-t border-iron mt-6 pt-6">
                <span className="text-[10px] tracking-[0.25em] text-steel block mb-4">
                  HIGHLIGHTS
                </span>
                <ul className="space-y-2">
                  {mergedDeepDive.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="text-xs text-ash leading-relaxed flex gap-2"
                    >
                      <span className="text-ember mt-[2px]">&#8226;</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </ScrollReveal>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-14 border-t border-iron">
        <div className="grid md:grid-cols-2 gap-8">
          <ScrollReveal>
            <article className="border border-iron p-6 md:p-8 h-full">
              <span className="text-[10px] tracking-[0.3em] text-steel block mb-5">
                CHALLENGE//
              </span>
              <p className="text-sm leading-relaxed text-ash">
                {mergedDeepDive.challenge}
              </p>
            </article>
          </ScrollReveal>
          <ScrollReveal delay={0.06}>
            <article className="border border-iron p-6 md:p-8 h-full">
              <span className="text-[10px] tracking-[0.3em] text-steel block mb-5">
                CONCEPT//
              </span>
              <p className="text-sm leading-relaxed text-ash">
                {mergedDeepDive.concept}
              </p>
            </article>
          </ScrollReveal>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-14 border-t border-iron">
        <ScrollReveal>
          <div className="border-b border-iron pb-4 mb-8">
            <h2 className="font-display text-4xl md:text-5xl tracking-tight">
              VISUAL NOTES
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mergedDeepDive.gallery.map((item, index) => (
            <ScrollReveal
              key={`${normalizedProject.number}-gallery-${item.title}`}
              delay={index * 0.05}
            >
              <article className="border border-iron bg-surface/30 h-full">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-iron">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-[11px] tracking-[0.22em] text-bone mb-3">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ash leading-relaxed">
                    {item.caption}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-14 border-t border-iron">
        <ScrollReveal>
          <div className="border border-iron bg-surface/40 p-6 md:p-10">
            <span className="text-[10px] tracking-[0.3em] text-steel block mb-5">
              DEMO//
            </span>
            <p className="text-sm md:text-base text-ash leading-relaxed max-w-3xl">
              {mergedDeepDive.demoSummary}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs tracking-[0.2em]">
              {demoUrl ? (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-ember/50 text-ember hover:bg-ember/10 transition-colors"
                >
                  OPEN DEMO &nearr;
                </a>
              ) : (
                <span className="px-4 py-2 border border-iron text-steel">
                  DEMO COMING SOON
                </span>
              )}

              {repoUrl ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-iron text-ash hover:text-ember hover:border-ember/40 transition-colors"
                >
                  SOURCE CODE &nearr;
                </a>
              ) : null}
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-24 pt-10 border-t border-iron">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <Link
            href="/projects"
            className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
          >
            &larr; ALL PROJECTS
          </Link>

          <div className="flex items-center gap-6 text-[10px] tracking-[0.2em]">
            {previousProject ? (
              <Link
                href={`/projects/${previousProject.number}`}
                className="text-steel hover:text-ember transition-colors"
              >
                PREV: {previousProject.number}
                {"//"}
              </Link>
            ) : (
              <span className="text-iron">PREV: --</span>
            )}

            {nextProject ? (
              <Link
                href={`/projects/${nextProject.number}`}
                className="text-steel hover:text-ember transition-colors"
              >
                NEXT: {nextProject.number}
                {"//"}
              </Link>
            ) : (
              <span className="text-iron">NEXT: --</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
