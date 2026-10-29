import type { Metadata } from "next";
import { PublicLink } from "@/components/PublicTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { createPublicPageMetadata } from "@/lib/siteMetadata";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy policy and data handling practices for this portfolio website and its contact form.",
  path: "/v1/privacy",
  imageAlt: "Privacy policy for this portfolio website.",
});

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const paragraphs = settings.privacyPolicy
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="pt-32 pb-24 px-6 md:px-12 lg:px-24 max-w-4xl">
      <ScrollReveal variant="row">
        <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
          <span>{settings.siteName}</span>
          <span>/</span>
          <span className="text-ember">PRIVACY</span>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="headline" delay={0.05}>
        <h1 className="font-display text-5xl md:text-7xl tracking-tighter mb-8">
          PRIVACY POLICY
        </h1>
      </ScrollReveal>

      <ScrollReveal variant="rule" delay={0.1}>
        <p className="text-[10px] tracking-[0.2em] text-steel mb-10">
          EFFECTIVE DATE: {settings.legalEffectiveDate}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.14}>
        <div className="space-y-6 text-sm leading-relaxed text-ash">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p>No privacy policy content configured yet.</p>
          )}
          <p>
            We measure public page views and link clicks using daily aggregate
            counts. This measurement does not use visitor cookies or store
            visitor IDs or IP addresses. URL queries and fragments are removed,
            and browser Do Not Track and Global Privacy Control signals are
            respected. Aggregate traffic is kept for up to 180 days and removed
            on the next accepted event after expiry.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="row" delay={0.18}>
        <div className="mt-16 border-t border-iron pt-8">
          <PublicLink
            href="/v1"
            intent="utility"
            className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
          >
            &larr; BACK TO INDEX
          </PublicLink>
        </div>
      </ScrollReveal>
    </section>
  );
}
