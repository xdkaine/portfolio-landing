import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectFigure } from "@/components/v2/Studio";
import { UmaWalkthrough } from "@/components/v2/UmaWalkthrough";
import { getProject, listProjects } from "@/lib/v2/catalog";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return { title: "Project not found" };
  const image = project.evidence?.[0];
  const images = image ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] : [];
  return {
    title: project.title, description: project.summary,
    alternates: { canonical: project.href },
    openGraph: { title: `${project.title} | Thomas Phao`, description: project.summary, url: project.href, images },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${project.title} | Thomas Phao`,
      description: project.summary, images: image ? [image.src] : [] },
  };
}
export default async function ProjectPage({ params }: Props) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const isUma = project.slug === "uma";
  const related = listProjects().items.filter(p => p.slug !== project.slug).slice(0, 2);
  return (
    <article className="v2-container v2-case-page">
      <Link href="/v2/work" className="v2-back-link"><span aria-hidden="true">← </span>All projects</Link>
      <header className="v2-case-heading">
        <div>
          <span className="v2-document-type">{project.writeup ?? "Project note"}</span>
          <h1>{project.title}</h1>
          <p className="v2-case-subtitle">{project.subtitle}</p>
        </div>
        <div className="v2-case-summary">
          <p>{project.summary}</p>
          <div className="v2-case-links">
            {project.source && <a href={project.source}>Public source on GitHub</a>}
            {isUma && <a href="#walkthrough">Follow a console request</a>}
          </div>
        </div>
      </header>
      <ProjectFigure project={project} priority wide />
      <dl className="v2-case-facts">
        <div><dt>Focus</dt><dd>{project.disciplines.join(" / ")}</dd></div>
        <div><dt>Project state</dt><dd>{project.state}</dd></div>
        {project.technologies.length > 0 && <div><dt>Stack</dt><dd>{project.technologies.join(" · ")}</dd></div>}
      </dl>
      <section className="v2-case-section" aria-labelledby="context-title">
        <h2 id="context-title">{project.writeup === "Case study" ? "Context" : "Project scope"}</h2>
        <div>
          {project.context && <p>{project.context}</p>}
          <p>{project.problem}</p>
        </div>
      </section>
      {isUma && <UmaWalkthrough />}
      <section className="v2-case-section" aria-labelledby="implementation-title">
        <h2 id="implementation-title">Implementation</h2>
        <div className="v2-decisions">
          {project.decisions?.length ? project.decisions.map(decision => (
            <section key={decision.title}><h3>{decision.title}</h3><p>{decision.body}</p></section>
          )) : <ul>{project.approach.map(text => <li key={text}>{text}</li>)}</ul>}
          {project.writeup === "Project note" && <p className="v2-note-disclosure">This entry describes the published project scope. A detailed case study is not available here yet.</p>}
        </div>
      </section>
      {project.evidence?.slice(1).map((image, index) => <ProjectFigure key={image.src} project={project} index={index + 1} wide />)}
      <aside className="v2-case-end" aria-label="Other projects">
        <h2>Other projects</h2>
        <div>{related.map(item => <Link key={item.slug} href={item.href}>{item.title}<span>{item.subtitle}</span></Link>)}</div>
        <Link href="/v2/work">Back to all projects</Link>
      </aside>
    </article>
  );
}
