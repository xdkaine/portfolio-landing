import { PublicLink, PublicSharedElement, PublicTransitionSurface } from "@/components/PublicTransition";
import { ProjectStatus } from "@/components/ProjectStatus";
import { listProjects } from "@/lib/projectCatalog";
import { getProjectTeaser } from "@/lib/projectTeaser";

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
      <header className="px-6 pb-10 pt-32 md:px-12 md:pt-40 lg:px-24">
        <h1 className="font-display text-6xl leading-none tracking-tighter md:text-8xl lg:text-9xl">PROJECTS</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ash">Applications, infrastructure, and experiments. Open a project for the context, decisions, and work behind it.</p>
        {!unavailable && projects.length > 0 ? (
          <p className="mt-9 border-y border-iron py-5 text-sm leading-relaxed text-ash">
            {projects.length} projects <span aria-hidden="true" className="mx-2 text-steel">/</span> {live} live · {inProgress} in progress · {archived} archived
          </p>
        ) : null}
      </header>

      <section className="px-6 pb-20 md:px-12 lg:px-24" aria-label="Project catalog">
        {unavailable ? (
          <div className="border-y border-iron py-12">
            <p role="status" className="text-base leading-relaxed text-ash">Projects couldn&apos;t be loaded. Please try again.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Retry the server read with a full page load. */}
            <a href="/v1/projects" className="mt-5 inline-block text-sm text-bone underline underline-offset-4">Reload projects</a>
          </div>
        ) : projects.length === 0 ? <p className="border-y border-iron py-12 text-base text-ash">No projects have been published yet.</p> : projects.map(project => (
          <PublicLink key={project.id} href={`/v1/projects/${project.number}`} intent="drill-in" className="group block border-b border-iron py-8 first:border-t md:py-10" aria-label={`Open ${project.title} case study`}>
            <article className="grid gap-4 md:grid-cols-[48px_minmax(0,1fr)_140px] md:gap-7">
              <PublicSharedElement kind="project-marker" itemKey={project.number}><span className="block pt-1 text-xs tabular-nums text-steel">{project.number.padStart(2, "0")}</span></PublicSharedElement>
              <div className="min-w-0">
                <PublicSharedElement kind="project-title" itemKey={project.number}><h2 className="font-display text-3xl leading-tight tracking-tight transition-colors group-hover:text-ember md:text-4xl [overflow-wrap:anywhere]">{project.title}</h2></PublicSharedElement>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-ash">{getProjectTeaser(project)}</p>
                {project.tags.length > 0 ? <p className="mt-4 text-xs leading-relaxed text-steel">{project.tags.slice(0, 4).join(" · ")}</p> : null}
                <span className="mt-5 inline-flex min-h-8 items-center gap-3 text-sm text-bone underline decoration-iron underline-offset-4 group-hover:text-ember">Read project <span aria-hidden="true">↗</span></span>
              </div>
              <div className="flex items-center justify-between gap-5 md:flex-col md:items-end md:justify-start">
                <ProjectStatus status={project.status} />
                <span className="text-xs text-steel">{project.year}</span>
              </div>
            </article>
          </PublicLink>
        ))}
        <PublicLink href="/v1" intent="section" className="mt-10 inline-flex min-h-10 items-center gap-3 text-sm text-ash underline underline-offset-4 hover:text-ember"><span aria-hidden="true">←</span> Back home</PublicLink>
      </section>
    </PublicTransitionSurface>
  );
}
