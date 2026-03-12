import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using this website.",
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const paragraphs = settings.termsOfService
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="pt-32 pb-24 px-6 md:px-12 lg:px-24 max-w-4xl">
      <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
        <span>{settings.siteName}</span>
        <span>/</span>
        <span className="text-ember">TERMS</span>
      </div>

      <h1 className="font-display text-5xl md:text-7xl tracking-tighter mb-8">
        TERMS OF SERVICE
      </h1>

      <p className="text-[10px] tracking-[0.2em] text-steel mb-10">
        EFFECTIVE DATE: {settings.legalEffectiveDate}
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-ash">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p>No terms content configured yet.</p>
        )}
      </div>

      <div className="mt-16 border-t border-iron pt-8">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
        >
          &larr; BACK TO INDEX
        </Link>
      </div>
    </section>
  );
}

