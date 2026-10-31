import type { Metadata } from "next";
import Link from "next/link";
import { ProjectFigure, ProjectRow } from "@/components/v2/Studio";
import { getProject, listProjects } from "@/lib/v2/catalog";

export const metadata: Metadata = { title: { absolute: "Thomas Phao | Infrastructure & applications" } };

export default function Home() {
  const uma = getProject("uma")!;
  const uar = getProject("uar")!;
  const otherProjects = listProjects().items.filter(p => !["uma", "uar"].includes(p.slug));
  return (
    <div className="v2-container v2-home">
      <section className="v2-opening" aria-labelledby="home-title">
        <div className="v2-person">
          <h1 id="home-title">Thomas Phao</h1>
          <p className="v2-role">Systems engineer &amp; developer</p>
          <p>I build web applications for shared infrastructure: Proxmox management, directory access, and on-prem deployment.</p>
          <p>This is a collection of that work, alongside smaller experiments.</p>
          <div className="v2-person-links">
            <a href="https://github.com/xdkaine">GitHub</a>
            <a href="https://linkedin.com/in/thomasphao">LinkedIn</a>
            <a href="mailto:hello@phao.dev">hello@phao.dev</a>
          </div>
          <Link className="v2-inline-link" href="/v2/work">All projects <span aria-hidden="true">→</span></Link>
        </div>
        <div className="v2-featured-project">
          <div className="v2-project-heading">
            <h2><Link href={uma.href}>Uma</Link></h2>
            <span>Proxmox management workspace</span>
          </div>
          <ProjectFigure project={uma} priority />
          <div className="v2-project-annotation">
            <p>Virtual machines, resource pools, and browser consoles in a workspace backed by LDAP and the Proxmox API.</p>
            <Link href={uma.href}>Read the Uma case study</Link>
            <Link href={`${uma.href}#walkthrough`}>Follow a console request</Link>
          </div>
        </div>
      </section>
      <section className="v2-uar-feature" aria-labelledby="uar-title">
        <div className="v2-feature-description">
          <h2 id="uar-title"><Link href={uar.href}>UAR</Link></h2>
          <p className="v2-project-purpose">Account requests, approvals, and directory operations.</p>
          <p>Built for the Cal Poly Pomona SOC/SDC environment. Follow a request from email verification through student and faculty approval to provisioning.</p>
          <Link href={uar.href}>Read the UAR case study</Link>
        </div>
        <ProjectFigure project={uar} />
      </section>
      <section className="v2-other-work" aria-labelledby="other-work-title">
        <div className="v2-section-heading">
          <h2 id="other-work-title">More projects</h2>
          <Link href="/v2/work">Browse the project index</Link>
        </div>
        <div className="v2-project-index">
          {otherProjects.map(project => <ProjectRow key={project.slug} project={project} />)}
        </div>
      </section>
      <section id="about" className="v2-about" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <div>
          <p>My work sits between infrastructure and application development. The larger projects here deal with shared systems: who can use them, how people get access, and what administrators need to see.</p>
          <p>I also work on smaller projects in Swift, messaging, and machine vision. Their project notes describe the scope and what’s still in progress.</p>
          <a href="https://linkedin.com/in/thomasphao">Experience on LinkedIn</a>
        </div>
      </section>
    </div>
  );
}
