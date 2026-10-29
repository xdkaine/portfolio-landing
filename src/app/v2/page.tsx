import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { ProjectCard, SystemDrawing } from "@/components/v2/Studio";
import { getHome } from "@/lib/v2/catalog";

export const metadata: Metadata = {
  title: { absolute: "Thomas Phao — Engineering Studio" },
};

export default function StudioHome() {
  const home = getHome();
  return (
    <>
      <section className="v2-hero v2-container" aria-labelledby="home-title">
        <div className="v2-hero-copy">
          <span className="v2-eyebrow">
            <span className="v2-dot" /> SYSTEMS ENGINEER &amp; DEVELOPER
          </span>
          <h1 id="home-title">
            Useful systems.
            <br />
            <em>Thoughtfully</em>
            <br />
            built<span className="v2-accent">.</span>
          </h1>
          <p>{home.description}</p>
          <div className="v2-hero-actions">
            <Link className="v2-button" href="/v2/work">
              Explore the work <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <a className="v2-inline-link" href="#about">
              A little about me <ArrowDownRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
        <SystemDrawing />
      </section>
      <div className="v2-discipline-strip v2-container">
        <span>THE COMMON THREAD</span>
        <p>
          Infrastructure <b>↗</b> Identity &amp; security <b>↗</b> Useful
          software
        </p>
      </div>
      <section
        className="v2-selected v2-container"
        aria-labelledby="selected-title"
      >
        <div className="v2-section-heading">
          <div>
            <span className="v2-eyebrow">01 / SELECTED WORK</span>
            <h2 id="selected-title">
              Ideas, put <em>to work.</em>
            </h2>
          </div>
          <Link className="v2-inline-link" href="/v2/work">
            All {home.projectCount} projects{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="v2-project-grid">
          {home.projects.map((project) => (
            <ProjectCard project={project} key={project.slug} />
          ))}
        </div>
      </section>
      <section
        className="v2-feature v2-container"
        aria-labelledby="feature-title"
      >
        <div className="v2-feature-marker" aria-hidden="true">
          ↳
        </div>
        <div>
          <span className="v2-eyebrow">GO BENEATH THE INTERFACE</span>
          <h2 id="feature-title">
            The interesting part is
            <br />
            <em>how it comes together.</em>
          </h2>
          <p>
            Follow a request through Uma. Explore the identity boundary,
            application decisions, and infrastructure behind a browser console.
          </p>
          <Link className="v2-inline-link" href="/v2/work/uma#walkthrough">
            Step inside the architecture{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="v2-feature-note">
          <span>PERSON</span>
          <i>↓</i>
          <span>POLICY</span>
          <i>↓</i>
          <span>PLATFORM</span>
        </div>
      </section>
      <section
        id="about"
        className="v2-about v2-container"
        aria-labelledby="about-title"
      >
        <div>
          <span className="v2-eyebrow">02 / THE PERSON BEHIND THE SYSTEMS</span>
          <h2 id="about-title">
            Hi, I’m Thomas.
            <br />
            <em>I like figuring things out.</em>
          </h2>
        </div>
        <div>
          <p>
            I’m a systems engineer and developer who moves between
            infrastructure and applications. I’m interested in the details that
            make software useful: a clear workflow, a sensible access boundary,
            and an interface that makes complex work approachable.
          </p>
          <p>
            My projects span identity governance, virtualization, developer
            platforms, and smaller experiments. This is a place to explore both
            the finished work and the thinking along the way.
          </p>
          <a
            className="v2-inline-link"
            href="https://linkedin.com/in/thomasphao"
          >
            Experience &amp; background{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}
