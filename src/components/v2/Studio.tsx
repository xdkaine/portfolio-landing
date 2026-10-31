import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/v2/catalog";
import type { WritingSummary } from "@/lib/v2/writing";

export function ProjectFigure({
  project, index = 0, priority = false, wide = false, focus = false,
}: { project: Project; index?: number; priority?: boolean; wide?: boolean; focus?: boolean }) {
  const image = project.evidence?.[index];
  if (!image) return null;
  return (
    <figure className={`v2-project-figure ${focus ? `v2-evidence-focus v2-evidence-${project.slug} v2-evidence-${project.slug}-${index}` : ""}`}>
      <a className="v2-image-viewport" href={image.src} aria-label={`Open ${project.title} screenshot ${index + 1} at full size`}>
        <Image src={image.src} alt={image.alt} width={image.width} height={image.height}
          sizes={wide ? "(max-width: 1300px) 100vw, 1280px" : "(max-width: 800px) 100vw, 900px"} priority={priority} unoptimized={focus} />
      </a>
      <figcaption><span>{image.caption}</span><a href={image.src}>Full image</a></figcaption>
    </figure>
  );
}

export function ProjectRow({ project, titleLevel = 3 }: { project: Project; titleLevel?: 2 | 3 }) {
  const Heading = titleLevel === 2 ? "h2" : "h3";
  return (
    <article className="v2-project-row">
      <div><Heading><Link href={project.href}>{project.title}</Link></Heading><p>{project.summary}</p></div>
      <div className="v2-project-row-meta">
        <span>{project.writeup ?? "Project"}</span><span>{project.state}</span>
        {project.technologies.length > 0 && <span className="v2-row-technologies">{project.technologies.slice(0, 3).join(" / ")}</span>}
      </div>
    </article>
  );
}

export function writingDate(post: Pick<WritingSummary, "publishedAt" | "date">) {
  const date = post.publishedAt ? new Date(post.publishedAt) : null;
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)
    : post.date;
}

export function WritingRow({ post, titleLevel = 3, compact = false }: {
  post: WritingSummary; titleLevel?: 2 | 3; compact?: boolean;
}) {
  const Heading = titleLevel === 2 ? "h2" : "h3";
  return (
    <article className={`v2-writing-row ${compact ? "v2-writing-compact" : ""}`}>
      <div><Heading><Link href={post.href}>{post.title}</Link></Heading>{!compact && <p>{post.excerpt}</p>}</div>
      <time dateTime={post.publishedAt ?? undefined}>{writingDate(post)}</time>
    </article>
  );
}

export function StudioHeader() {
  return (
    <header className="v2-header v2-container">
      <Link href="/v2" className="v2-brand" aria-label="Thomas Phao home">phao.dev</Link>
      <nav aria-label="Main navigation">
        <Link href="/v2/work">Library</Link>
        <Link href="/v2#about">About</Link>
        <a href="mailto:hello@phao.dev">Email</a>
      </nav>
    </header>
  );
}
export function StudioFooter() {
  return (
    <footer className="v2-footer v2-container">
      <span>Thomas Phao</span>
      <div><a href="mailto:hello@phao.dev">Email</a><a href="https://github.com/xdkaine">GitHub</a><a href="https://linkedin.com/in/thomasphao">LinkedIn</a></div>
    </footer>
  );
}
