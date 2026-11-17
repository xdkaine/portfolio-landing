import { PublicLink, PublicSharedElement, PublicTransitionSurface } from "@/components/PublicTransition";
import { ProjectStatus } from "@/components/ProjectStatus";
import { listProjects } from "@/lib/projectCatalog";
import { getProjectTeaser } from "@/lib/projectTeaser";
import { ScrollReveal } from "@/components/ScrollReveal";
import { projectCover } from "@/lib/projectMedia";
import { ProjectImage } from "@/components/ProjectImage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage() {
  const { projects, unavailable } = await listProjects()
    .then(projects => ({ projects, unavailable: false }))
    .catch(() => ({ projects: [], unavailable: true }));
  const live = projects.filter(project => project.status === "LIVE").length;
  const inProgress = projects.filter(project => project.status === "IN PROGRESS").length;
  const archived = projects.filter(project => project.status === "ARCHIVED").length;

  return (
    <PublicTransitionSurface>
      <header className="mx-auto max-w-[1800px] px-6 pb-5 pt-28 md:px-12 md:pt-32 lg:px-24">
        <ScrollReveal variant="headline" delay={0.05}>
          <h1 className="font-display text-6xl leading-none tracking-tighter md:text-8xl">PROJECTS</h1>
        </ScrollReveal>
        <ScrollReveal variant="block" delay={0.1}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ash">Applications, infrastructure, and experiments. Open a project for the context, decisions, and work behind it.</p>
        </ScrollReveal>
        {!unavailable && projects.length > 0 ? (
          <ScrollReveal variant="block" delay={0.12}>
            <p className="mt-6 border-y border-iron py-4 text-sm leading-relaxed text-ash">
              {projects.length} projects <span aria-hidden="true" className="mx-2 text-steel">/</span> {live} live · {inProgress} in progress · {archived} archived
            </p>
          </ScrollReveal>
        ) : null}
      </header>

      <section className="mx-auto max-w-[1800px] px-6 pb-20 md:px-12 lg:px-24" aria-label="Project catalog">
        {unavailable ? (
          <div className="border-y border-iron py-12">
            <p role="status" className="text-base leading-relaxed text-ash">Projects couldn&apos;t be loaded. Please try again.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Retry the server read with a full page load. */}
            <a href="/v1/projects" className="mt-5 inline-block text-sm text-bone underline underline-offset-4">Reload projects</a>
          </div>
        ) : projects.length === 0 ? <p className="border-y border-iron py-12 text-base text-ash">No projects have been published yet.</p> : projects.map((project, index) => { const cover = projectCover(project.caseStudy); return (
          <ScrollReveal key={project.id} variant="row" delay={Math.min(index * 0.04, 0.16)}>
            <PublicLink href={`/v1/projects/${project.number}`} intent="drill-in" className={`group block border-b border-iron py-8 md:py-10 ${index === 0 ? "border-t" : ""}`} aria-label={`View project: ${project.title}`}>
              <article className={`grid items-center gap-6 md:gap-10 ${cover ? "lg:grid-cols-2" : "lg:grid-cols-[minmax(0,1fr)_auto]"}`}>
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-steel"><PublicSharedElement kind="project-marker" itemKey={project.number}><span className="tabular-nums">{project.number.padStart(2, "0")}</span></PublicSharedElement><ProjectStatus status={project.status} /><span>{project.year}</span></div>
                  <PublicSharedElement kind="project-title" itemKey={project.number}><h2 className="font-display text-3xl leading-tight tracking-tight transition-colors group-hover:text-ember md:text-4xl [overflow-wrap:anywhere]">{project.title}</h2></PublicSharedElement>
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-ash">{getProjectTeaser(project)}</p>
                  {project.tags.length > 0 ? <p className="mt-4 text-xs leading-relaxed text-steel">{project.tags.slice(0, 4).join(" · ")}</p> : null}
                  <span className="mt-5 inline-flex min-h-8 items-center gap-3 text-sm text-bone underline decoration-iron underline-offset-4 group-hover:text-ember">Read project <span aria-hidden="true">↗</span></span>
                </div>
                {cover ? <figure className="min-w-0"><ProjectImage src={cover.image} alt={cover.alt || cover.title || project.title} priority={index === 0} />{cover.caption ? <figcaption className="mt-3 text-xs leading-relaxed text-steel">{cover.caption}</figcaption> : null}</figure> : null}
              </article>
            </PublicLink>
          </ScrollReveal>
        ); })}
        <PublicLink href="/v1" intent="section" className="mt-10 inline-flex min-h-10 items-center gap-3 text-sm text-ash underline underline-offset-4 hover:text-ember"><span aria-hidden="true">←</span> Back home</PublicLink>
      </section>
    </PublicTransitionSurface>
  );
}
