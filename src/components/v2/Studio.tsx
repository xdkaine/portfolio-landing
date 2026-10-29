import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Github,
  Layers3,
  Network,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { Project } from "@/lib/v2/catalog";

export function SystemDrawing() {
  return (
    <div
      className="v2-system"
      role="img"
      aria-label="An architectural illustration connecting a person, identity, an application, and infrastructure"
    >
      <div className="v2-drawing-label">
        <span>CONNECTED BY DESIGN</span>
        <span>FIG. 01</span>
      </div>
      <svg viewBox="0 0 500 390" fill="none" aria-hidden="true">
        <defs>
          <pattern
            id="v2-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 25 0 L 0 0 0 25"
              stroke="currentColor"
              strokeOpacity=".07"
            />
          </pattern>
        </defs>
        <rect width="500" height="390" fill="url(#v2-grid)" />
        <path
          d="M250 58V102M250 166V210M160 274V316H340V274M250 274V337"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          opacity=".45"
        />
        <circle cx="250" cy="44" r="16" stroke="currentColor" />
        <circle cx="250" cy="40" r="4" stroke="currentColor" />
        <path d="M243 50c0-8 14-8 14 0" stroke="currentColor" />
        <rect
          x="135"
          y="102"
          width="230"
          height="64"
          rx="3"
          fill="var(--v2-paper)"
          stroke="currentColor"
        />
        <path
          d="M162 123l9-4 9 4v10c0 6-9 10-9 10s-9-4-9-10z"
          stroke="currentColor"
        />
        <text x="197" y="131" fill="currentColor" fontSize="14">
          Identity &amp; access
        </text>
        <text x="197" y="149" fill="currentColor" opacity=".6" fontSize="10">
          THE RIGHT BOUNDARIES
        </text>
        <rect
          x="90"
          y="210"
          width="320"
          height="64"
          rx="3"
          fill="var(--v2-ink)"
          stroke="var(--v2-ink)"
        />
        <text x="117" y="239" fill="var(--v2-paper)" fontSize="16">
          Useful software
        </text>
        <text x="117" y="258" fill="var(--v2-paper)" opacity=".7" fontSize="10">
          A CONSIDERED EXPERIENCE
        </text>
        <path
          d="M368 232l9 9-9 9m-14-9h22"
          stroke="var(--v2-paper)"
          strokeWidth="1.5"
        />
        {[120, 210, 300].map((x) => (
          <g key={x}>
            <rect
              x={x}
              y="337"
              width="80"
              height="28"
              rx="2"
              fill="var(--v2-paper)"
              stroke="currentColor"
            />
            <circle cx={x + 12} cy="351" r="2.5" fill="var(--v2-accent)" />
            <path d={`M${x + 23} 351h43`} stroke="currentColor" opacity=".4" />
          </g>
        ))}
        <circle cx="250" cy="189" r="5" fill="var(--v2-accent)" />
        <text
          x="18"
          y="187"
          fill="currentColor"
          fontSize="9"
          opacity=".55"
          transform="rotate(-90 18 187)"
        >
          PEOPLE → SYSTEMS
        </text>
      </svg>
      <div className="v2-drawing-footer">
        <span>Infrastructure with a human perspective.</span>
        <ArrowDown size={16} />
      </div>
    </div>
  );
}

export function ProjectVisual({ project }: { project: Project }) {
  if (project.motif === "uma")
    return (
      <div className="v2-project-visual v2-visual-uma" aria-hidden="true">
        <div className="v2-visual-caption">
          <Layers3 size={18} />
          <span>A WORKSPACE FOR INFRASTRUCTURE</span>
        </div>
        <Image
          src="/v2/uma-workspace.png"
          alt=""
          width={2560}
          height={1392}
          sizes="(max-width: 760px) 100vw, 45vw"
        />
      </div>
    );
  const identity = project.motif === "identity";
  const platform = project.motif === "platform" || project.motif === "cloud";
  const Icon = identity
    ? ShieldCheck
    : platform
      ? Layers3
      : project.motif === "terminal"
        ? Terminal
        : Network;
  const labels = identity
    ? ["REQUEST", "REVIEW", "ACCESS"]
    : platform
      ? ["REPOSITORY", "BUILD", "DEPLOY"]
      : project.motif === "terminal"
        ? ["CONNECT", "AUTHENTICATE", "SHELL"]
        : ["EXPLORE", "CONNECT", "BUILD"];
  return (
    <div
      className={`v2-project-visual v2-visual-${project.motif}`}
      aria-hidden="true"
    >
      <div className="v2-visual-caption">
        <Icon size={18} />
        <span>
          {identity
            ? "IDENTITY, WITH INTENT"
            : platform
              ? "A PATH TO YOUR PLATFORM"
              : "AN IDEA IN PROGRESS"}
        </span>
      </div>
      <div className="v2-flow-art">
        <div className="v2-flow-emblem">
          <Icon strokeWidth={1} size={46} />
        </div>
        <div className="v2-flow-line">
          {labels.map((label, i) => (
            <span key={label}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="v2-project-card">
      <Link className="v2-project-link" href={project.href}>
        <ProjectVisual project={project} />
        <div className="v2-project-meta">
          <span>{project.disciplines[0]}</span>
          <span>{project.state}</span>
        </div>
        <div className="v2-project-title">
          <h3>{project.title}</h3>
          <ArrowUpRight aria-hidden="true" size={24} />
        </div>
        <p>{project.summary}</p>
        <div className="v2-project-tags">
          {project.technologies.slice(0, 3).map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      </Link>
    </article>
  );
}

export function StudioHeader() {
  return (
    <header className="v2-header v2-container">
      <Link
        href="/v2"
        className="v2-brand"
        aria-label="Thomas Phao studio home"
      >
        <span className="v2-brand-mark" aria-hidden="true">
          p.
        </span>
        <span>
          phao.dev<span className="v2-brand-sub">THOMAS PHAO</span>
        </span>
      </Link>
      <nav aria-label="Studio navigation">
        <Link href="/v2/work">Work</Link>
        <Link href="/v2#about">About</Link>
        <a href="https://github.com/xdkaine" aria-label="Thomas Phao on GitHub">
          <Github size={20} />
        </a>
      </nav>
    </header>
  );
}

export function StudioFooter() {
  return (
    <footer className="v2-footer v2-container">
      <div className="v2-footer-main">
        <div>
          <span className="v2-eyebrow">
            GOOD WORK STARTS WITH A CONVERSATION
          </span>
          <h2>
            Something in mind?
            <br />
            <em>Let’s connect.</em>
          </h2>
        </div>
        <a className="v2-button" href="mailto:hello@phao.dev">
          hello@phao.dev <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
      <div className="v2-footer-bottom">
        <span>© {new Date().getFullYear()} Thomas Phao</span>
        <span>Built with curiosity. Maintained with care.</span>
        <a href="https://linkedin.com/in/thomasphao">
          LinkedIn <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
