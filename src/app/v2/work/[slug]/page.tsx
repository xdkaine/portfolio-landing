import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ProjectVisual } from "@/components/v2/Studio";
import { UmaWalkthrough } from "@/components/v2/UmaWalkthrough";
import { getProject } from "@/lib/v2/catalog";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project
    ? {
        title: project.title,
        description: project.summary,
        alternates: { canonical: project.href },
        openGraph: {
          title: `${project.title} — Thomas Phao`,
          description: project.summary,
          url: project.href,
          images: ["/v2/uma-workspace.png"],
        },
      }
    : { title: "Project not found" };
}
export default async function CaseStudyPage({ params }: Props) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const isUma = project.slug === "uma";
  return (
    <div className="v2-container v2-case-page">
      <Link href="/v2/work" className="v2-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Project library
      </Link>
      <div className="v2-case-heading">
        <div>
          <span className="v2-eyebrow">
            {project.disciplines[0].toUpperCase()} /{" "}
            {project.state.toUpperCase()}
          </span>
          <h1>
            {project.title}
            <span className="v2-accent">.</span>
          </h1>
          <p className="v2-case-subtitle">{project.subtitle}</p>
        </div>
        <div className="v2-case-summary">
          <p>{project.summary}</p>
          {isUma && (
            <a className="v2-button" href="#walkthrough">
              Explore the architecture{" "}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
          {project.source && (
            <a className="v2-inline-link" href={project.source}>
              View source on GitHub{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
      <div className="v2-case-cover">
        <ProjectVisual project={project} />
      </div>
      <div className="v2-case-facts">
        <div>
          <span className="v2-eyebrow">FOCUS</span>
          <p>{project.disciplines.join(" / ")}</p>
        </div>
        <div>
          <span className="v2-eyebrow">PROJECT STATE</span>
          <p>{project.state}</p>
        </div>
        <div>
          <span className="v2-eyebrow">TECHNOLOGIES</span>
          <p>
            {project.technologies.length
              ? project.technologies.join(" · ")
              : "Exploratory project"}
          </p>
        </div>
      </div>
      <section className="v2-case-context">
        <div>
          <span className="v2-eyebrow">THE STARTING POINT</span>
          <h2>
            A problem worth
            <br />
            <em>working on.</em>
          </h2>
        </div>
        <p>{project.problem}</p>
      </section>
      {isUma && <UmaWalkthrough />}
      <section className="v2-case-approach">
        <span className="v2-eyebrow">DESIGN &amp; IMPLEMENTATION</span>
        <h2>{isUma ? "How the pieces fit together" : "The approach"}</h2>
        <div className="v2-approach-grid">
          {project.approach.map((text, i) => (
            <div key={text}>
              <span className="v2-eyebrow">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      {isUma && (
        <figure className="v2-case-screenshot">
          <Image
            src="/v2/uma-overview.png"
            alt="Uma administrator dashboard showing the published cluster overview and resource management interface"
            width={2560}
            height={1392}
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
          <figcaption>
            <span>UMA / ADMINISTRATOR VIEW</span>
            <span>
              Screenshot from the published project. Historical interface, not
              live telemetry.
            </span>
          </figcaption>
        </figure>
      )}
      <div className="v2-case-end">
        <span className="v2-eyebrow">THERE’S MORE TO EXPLORE</span>
        <Link href="/v2/work">
          Back to the collection <ArrowUpRight size={24} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
