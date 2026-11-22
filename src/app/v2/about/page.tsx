import { ScrollReveal } from "@/components/v2/ScrollReveal";
import { PublicTransitionSurface } from "@/components/v2/PublicTransition";
import { PostDocumentBody } from "@/components/v2/blog/PostBody";
import { getAboutContent } from "@/lib/aboutStore";
import { getSiteSettings } from "@/lib/siteSettings";
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [{ content }, settings] = await Promise.all([getAboutContent(), getSiteSettings()]);
  const specs = [["ROLE", content.currentRole], ["FOCUS", content.focus], ["LOCATION", content.location], ["EXPERIENCE", content.experience], ["STATUS", content.status]];
  return <PublicTransitionSurface><div data-about-page className="mx-auto max-w-[1800px] px-6 md:px-12 lg:px-24">
    <header className="pt-28 pb-8 md:pt-32"><ScrollReveal variant="row"><div className="mb-6 flex gap-3 text-xs text-steel"><span>{settings.siteName}</span><span>/</span><span className="text-ember">ABOUT</span></div></ScrollReveal><ScrollReveal variant="headline"><h1 className="font-display text-[clamp(3rem,7vw,7rem)] leading-[1.05] tracking-tighter">{content.title}</h1></ScrollReveal></header>
    <section className="grid items-start gap-8 border-y border-iron py-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
      <ScrollReveal><div className="border-l-2 border-ember pl-5 md:pl-8"><p className="text-base leading-relaxed text-bone md:text-lg">{content.personalNote}</p></div></ScrollReveal>
      <ScrollReveal variant="block"><div className="border-2 border-iron p-5 md:p-7"><p className="mb-5 text-xs text-steel"><span>$ cat /etc/profile</span> <span className="cursor-blink text-ember">▊</span></p><dl className="space-y-3">{specs.filter(([,value]) => value).map(([label, value]) => <div key={label} className="grid grid-cols-[90px_1fr] gap-3 text-xs leading-relaxed"><dt className="text-steel">{label}</dt><dd className={label === "STATUS" ? "text-ember" : "text-bone"}>{value}</dd></div>)}</dl></div></ScrollReveal>
    </section>
    <section className="py-10 md:py-12" aria-label="About me"><PostDocumentBody document={content.bodyJson} story reveal /></section>
    {content.techGroups.length ? <section className="border-t border-iron py-10 md:pb-16"><ScrollReveal variant="headline"><h2 className="mb-8 font-display text-4xl md:text-5xl">TECH STACK</h2></ScrollReveal><div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{content.techGroups.map((group, index) => <ScrollReveal key={`${group.category}-${index}`} variant="row"><h3 className="mb-4 text-xs tracking-widest text-steel">{group.category}/</h3><ul className="space-y-2 text-sm text-bone">{group.items.map((item, i) => <li key={`${item}-${i}`}><span aria-hidden="true" className="mr-3 text-steel">{i === group.items.length - 1 ? "└──" : "├──"}</span>{item}</li>)}</ul></ScrollReveal>)}</div></section> : null}
  </div></PublicTransitionSurface>;
}
