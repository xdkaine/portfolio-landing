import type { Metadata } from "next";
import Link from "next/link";
import { ProjectFigure, ProjectRow, WritingRow } from "@/components/v2/Studio";
import { getProject, listProjects } from "@/lib/v2/catalog";
import { listWriting } from "@/lib/v2/writingServer";
import { WritingUnavailableError, type WritingSummary } from "@/lib/v2/writing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Thomas Phao | Projects & writing" } };

export default async function Home() {
  const uma = getProject("uma")!;
  const uar = getProject("uar")!;
  const selected = ["tbd-dev", "sdc-cloud", "rog-tools"].map(slug => getProject(slug)!);
  let posts: WritingSummary[] = [];
  let writingUnavailable = false;
  try { posts = (await listWriting()).items; }
  catch (error) { if (!(error instanceof WritingUnavailableError)) throw error; writingUnavailable = true; }
  return (
    <div className="v2-container v2-home">
      <section className="v2-opening" aria-labelledby="home-title">
        <div className="v2-person">
          <h1 id="home-title">Thomas Phao</h1>
          <p className="v2-role">Systems engineer &amp; developer</p>
          <p>I build tools for shared infrastructure. My work in Cal Poly Pomona’s SOC/SDC includes VM management and account-request workflows.</p>
          <div className="v2-person-links">
            <a href="https://github.com/xdkaine">GitHub</a>
            <a href="https://linkedin.com/in/thomasphao">LinkedIn</a>
            <a href="mailto:hello@phao.dev">hello@phao.dev</a>
          </div>
          <Link className="v2-inline-link" href="/v2/work">Projects &amp; writing <span aria-hidden="true">→</span></Link>
        </div>
        <div className="v2-featured-project">
          <div className="v2-project-heading"><h2><Link href={uma.href}>Uma</Link></h2><span>Proxmox management</span></div>
          <ProjectFigure project={uma} index={1} priority focus />
          <div className="v2-project-annotation">
            <p>A VM console starts with an access check and a ticket. Keeping the browser connected takes a separate WebSocket proxy.</p>
            <Link href={uma.href}>How the console connection works</Link>
          </div>
        </div>
      </section>
      <section className="v2-uar-feature" aria-labelledby="uar-title">
        <div className="v2-feature-description">
          <h2 id="uar-title"><Link href={uar.href}>UAR</Link></h2>
          <p className="v2-project-purpose">Access requests for new and existing accounts.</p>
          <p>The portal links existing accounts and keeps a verified request moving when its notification email needs a retry.</p>
          <Link href={uar.href}>Inside the request workflow</Link>
        </div>
        <ProjectFigure project={uar} focus />
      </section>
      <section className="v2-work-notes" aria-labelledby="work-notes-title">
        <div className="v2-section-heading"><h2 id="work-notes-title">Work &amp; writing</h2><Link href="/v2/work">Browse the library</Link></div>
        <div className="v2-work-notes-columns">
          <div><p className="v2-list-label">Projects</p><div className="v2-project-index">
            {selected.map(project => <ProjectRow key={project.slug} project={project} />)}
          </div><Link className="v2-inline-link" href="/v2/work?kind=projects">All {listProjects().total} projects</Link></div>
          <div><p className="v2-list-label">Writing</p>
            {writingUnavailable ? <p className="v2-availability" role="status">Writing is temporarily unavailable. <Link href="/v2/work?kind=writing">Try the writing library</Link>.</p>
              : posts?.length ? <div className="v2-writing-index">{posts.slice(0, 3).map(post => <WritingRow key={post.slug} post={post} compact />)}</div>
                : <p className="v2-availability">No published writing yet.</p>}
          </div>
        </div>
      </section>
      <section id="about" className="v2-about" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <div><p>Alongside the SOC/SDC work, I built an isolated nested lab and a separate homelab. I write about those builds here.</p>
          <a href="https://linkedin.com/in/thomasphao">Experience on LinkedIn</a></div>
      </section>
    </div>
  );
}
