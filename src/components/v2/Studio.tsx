import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/v2/catalog";

export function ProjectFigure({
  project, index = 0, priority = false, wide = false,
}: { project: Project; index?: number; priority?: boolean; wide?: boolean }) {
  const image = project.evidence?.[index];
  if (!image) return null;
  return (
    <figure className="v2-project-figure">
      <a href={image.src} aria-label={`Open ${project.title} screenshot ${index + 1} at full size`}>
        <Image src={image.src} alt={image.alt} width={image.width} height={image.height}
          sizes={wide ? "(max-width: 1300px) 100vw, 1280px" : "(max-width: 800px) 100vw, (max-width: 1300px) 70vw, 900px"} priority={priority} />
      </a>
      <figcaption>
        <span>{image.caption}</span>
        <a href={image.src}>Full-size image</a>
      </figcaption>
    </figure>
  );
}

export function ProjectRow({ project, titleLevel = 3 }: { project: Project; titleLevel?: 2 | 3 }) {
  const Heading = titleLevel === 2 ? "h2" : "h3";
  return (
    <article className="v2-project-row">
      <div>
        <Heading><Link href={project.href}>{project.title}</Link></Heading>
        <p>{project.summary}</p>
      </div>
      <div className="v2-project-row-meta">
        <span>{project.writeup ?? "Project note"}</span>
        <span>{project.state}</span>
        {project.technologies.length > 0 && <span>{project.technologies.slice(0, 3).join(" / ")}</span>}
      </div>
    </article>
  );
}

export function StudioHeader() {
  return (
    <header className="v2-header v2-container">
      <Link href="/v2" className="v2-brand" aria-label="Thomas Phao home">phao.dev</Link>
      <nav aria-label="Main navigation">
        <Link href="/v2/work">Projects</Link>
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
      <div>
        <a href="mailto:hello@phao.dev">Email</a>
        <a href="https://github.com/xdkaine">GitHub</a>
        <a href="https://linkedin.com/in/thomasphao">LinkedIn</a>
      </div>
    </footer>
  );
}
