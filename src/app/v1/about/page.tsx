import Image from "next/image";
import { PublicLink, PublicTransitionSurface } from "@/components/PublicTransition";
import { getSiteSettings } from "@/lib/siteSettings";
import { PORTFOLIO_NAME } from "@/lib/siteMetadata";
import { PORTFOLIO_PROFILE } from "@/lib/portfolioProfile";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <PublicTransitionSurface>
      <article className="px-6 pb-16 pt-32 md:px-12 md:pb-24 md:pt-36 lg:px-24" data-about-page>
        <header className="mx-auto max-w-6xl border-b border-iron pb-12 text-center md:pb-16">
          <p className="mb-5 text-sm text-ash">{PORTFOLIO_NAME}</p>
          <h1 aria-label={`About ${PORTFOLIO_NAME}`} className="font-display text-[clamp(5rem,12vw,10rem)] leading-[1.04] tracking-tighter text-bone">About me.</h1>
          <p className="mx-auto mt-7 max-w-3xl font-editorial text-xl leading-relaxed text-ash md:text-2xl">A builder and developer working across applications and the infrastructure behind them.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-ash">
            <a href={settings.socialLinkedin || "https://linkedin.com/in/thomasphao"} target="_blank" rel="noopener noreferrer" className="text-bone underline decoration-steel underline-offset-4 hover:text-ember">{PORTFOLIO_PROFILE.currentRole} <span aria-hidden="true">↗</span></a>
            <span aria-hidden="true" className="hidden h-1 w-1 bg-ember sm:block" />
            <span>Los Angeles, CA</span>
          </div>
        </header>

        <section aria-label="My background" className="mx-auto grid max-w-6xl gap-10 py-12 md:grid-cols-2 md:gap-12 md:py-16 lg:gap-20">
          <div>
            <h2 className="mb-5 text-sm text-ember">Why I build</h2>
            <p className="font-editorial text-xl leading-relaxed text-bone md:text-2xl">{PORTFOLIO_PROFILE.personalNote}</p>
          </div>
          <div className="space-y-6 text-base leading-relaxed text-ash md:pt-10 md:text-lg">
            <p>I&apos;m a developer who works across applications and infrastructure. The work I enjoy most is building and deploying systems that other people actually use. That can mean an application, the infrastructure behind it, or getting the two working together.</p>
            <p>In my current role, I support work across enterprise technologies, ERP platforms, and the systems around them. Outside that role, I keep building applications and infrastructure, and use this site to share what I&apos;m working on and learning.</p>
          </div>
        </section>

        <section aria-labelledby="about-in-practice" className="mx-auto max-w-6xl border-t border-iron pt-10 md:pt-12">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="about-in-practice" className="font-display text-3xl tracking-tight md:text-4xl">What that looks like.</h2>
            <PublicLink href="/v1/projects" intent="section" className="inline-flex min-h-10 items-center gap-2 text-sm text-ash underline underline-offset-4 hover:text-ember">Explore my projects <span aria-hidden="true">↗</span></PublicLink>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <PublicLink href="/v1/projects/2" intent="drill-in" className="group block min-w-0" aria-label="Read about Uma, a Proxmox management application">
              <figure>
                <div className="overflow-hidden border border-iron bg-surface"><Image src="/v2/uma-overview.png" alt="Uma interface for viewing and managing virtual machines" width={1440} height={900} sizes="(min-width: 1280px) 568px, (min-width: 768px) calc((100vw - 144px) / 2), calc(100vw - 48px)" className="aspect-[16/10] w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.015]" /></div>
                <figcaption className="mt-4 flex items-baseline justify-between gap-4 text-sm"><span className="text-bone group-hover:text-ember">Uma</span><span className="text-ash">Virtual machine management <span aria-hidden="true">↗</span></span></figcaption>
              </figure>
            </PublicLink>
            <PublicLink href="/v1/projects/1" intent="drill-in" className="group block min-w-0" aria-label="Read about UAR, an account request application">
              <figure>
                <div className="overflow-hidden border border-iron bg-surface"><Image src="/v2/uar-dashboard.png" alt="UAR interface for reviewing account requests" width={1440} height={900} sizes="(min-width: 1280px) 568px, (min-width: 768px) calc((100vw - 144px) / 2), calc(100vw - 48px)" className="aspect-[16/10] w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.015]" /></div>
                <figcaption className="mt-4 flex items-baseline justify-between gap-4 text-sm"><span className="text-bone group-hover:text-ember">UAR</span><span className="text-ash">Account request workflows <span aria-hidden="true">↗</span></span></figcaption>
              </figure>
            </PublicLink>
          </div>
        </section>

        <section aria-label="Get in touch" className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-6 border-t border-iron pt-10 md:mt-16 md:pt-12">
          <p className="font-display text-3xl leading-tight tracking-tight md:text-4xl">Want to talk about something?</p>
          <PublicLink href="/v1/contact" intent="section" className="inline-flex min-h-12 items-center gap-8 border border-ember bg-ember px-6 text-sm text-void transition-colors hover:border-bone hover:bg-bone">Get in touch <span aria-hidden="true">↗</span></PublicLink>
        </section>
      </article>
    </PublicTransitionSurface>
  );
}
