import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectFigure, WritingRow } from "@/components/v2/Studio";
import { UmaWalkthrough } from "@/components/v2/UmaWalkthrough";
import { getProject } from "@/lib/v2/catalog";
import { listWriting } from "@/lib/v2/writingServer";
import { WritingUnavailableError, writingForProject, type WritingSummary } from "@/lib/v2/writing";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return { title: "Project not found" };
  const image = project.evidence?.[0];
  const images = image ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] : [];
  return { title: project.title, description: project.summary, alternates: { canonical: project.href },
    openGraph: { title: `${project.title} | Thomas Phao`, description: project.summary, url: project.href, images },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${project.title} | Thomas Phao`, description: project.summary, images: image ? [image.src] : [] } };
}
export default async function ProjectPage({ params }: Props) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const fullCase = project.writeup === "Case study";
  const compact = ["term-ios", "btchat", "the-machine"].includes(project.slug);
  const relatedSlug = project.slug === "uma" ? "uar" : project.slug === "uar" ? "uma" : null;
  const relatedProject = relatedSlug ? getProject(relatedSlug) : null;
  let relatedWriting: WritingSummary[] = [];
  let writingUnavailable = false;
  if (project.slug === "sdc-cloud") {
    try { relatedWriting = writingForProject((await listWriting()).items, project.slug); }
    catch (error) { if (!(error instanceof WritingUnavailableError)) throw error; writingUnavailable = true; }
  }
  return (
    <article className={`v2-container v2-case-page ${compact ? "v2-short-note" : ""}`}>
      <Link href="/v2/work" className="v2-back-link">← Back to library</Link>
      <header className={`v2-case-heading ${!fullCase ? "v2-note-heading" : ""}`}>
        <div><span className="v2-document-type">{fullCase ? "Project" : project.state}</span><h1>{project.title}</h1>
          <p className="v2-case-subtitle">{fullCase ? project.subtitle : project.summary}</p></div>
        <div className="v2-case-summary">
          {fullCase && project.context && <p>{project.context}</p>}
          <div className="v2-case-links">
            {project.source && <a href={project.source}>Public source on GitHub</a>}
            {project.slug === "uma" && <a href="#walkthrough">Trace a console request</a>}
          </div>
        </div>
      </header>
      {fullCase && <div className="v2-case-opening">
        <ProjectFigure project={project} priority focus wide />
        <p className="v2-case-constraint">{project.problem}</p>
      </div>}
      {!compact && <div className="v2-case-stack"><span>{project.state}</span>
        {project.technologies.length > 0 && <span>{project.technologies.join(" · ")}</span>}</div>}
      {fullCase ? <div className="v2-case-narrative">
        {project.decisions?.map((decision, index) => {
          if (project.slug === "uma" && index === 1) return <UmaWalkthrough key={decision.title} />;
          if (project.slug === "uar" && index === 1) return null;
          const paired = (project.slug === "uar" && index === 0) || (project.slug === "uma" && index === 3);
          const chapters = project.slug === "uar" && index === 0 ? project.decisions!.slice(0, 2) : [decision];
          const sourceLabels = project.slug === "uar" ? ["Request handler", "Verification handler", "Public source", "Project documentation"] : ["VM access check", "Console proxy", "Console route", "Project documentation"];
          return <section key={decision.title} className={paired ? "v2-case-decision v2-decision-with-evidence" : "v2-case-decision"}>
            <div>{chapters.map((chapter, chapterIndex) => <div className="v2-decision-chapter" key={chapter.title}><h2>{chapter.title}</h2><p>{chapter.body}</p>
              {chapter.source && <a className="v2-decision-source" href={chapter.source}>{sourceLabels[index + chapterIndex] ?? "Public source"}</a>}</div>)}</div>
            {paired && <ProjectFigure project={project} index={1} focus />}
          </section>;
        })}
      </div> : !compact && <div className="v2-note-body">
        {project.context && <p>{project.context}</p>}
        <ul>{project.approach.map(text => <li key={text}>{text}</li>)}</ul>
      </div>}
      {compact && project.technologies.length > 0 && <p className="v2-note-stack">{project.technologies.join(" · ")}</p>}
      {(relatedWriting?.length || writingUnavailable) ? <aside className="v2-related-writing" aria-label="Related writing">
        <h2>Related writing</h2>
        {writingUnavailable ? <p className="v2-availability">Related writing is temporarily unavailable.</p>
          : relatedWriting?.map(post => <WritingRow key={post.slug} post={post} compact />)}
      </aside> : null}
      <footer className="v2-case-end">
        {relatedProject && <p>Another access workflow: <Link href={relatedProject.href}>{relatedProject.title}</Link></p>}
        <Link href="/v2/work">Back to the library</Link>
      </footer>
    </article>
  );
}
