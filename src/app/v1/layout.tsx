import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { LinkClickTracker } from "@/components/LinkClickTracker";
import { BackgroundContextMenu } from "@/components/BackgroundContextMenu";
import { PublicTransitionSurface } from "@/components/PublicTransition";
import { parseBrandAliases } from "@/lib/brandAliases";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function V1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const brandAliases = parseBrandAliases(settings.siteAliases);
  const primaryBrandName = brandAliases[0] ?? settings.siteName;
  const footerSocials = [
    { label: "GITHUB", href: settings.socialGithub },
    { label: "TWITTER", href: settings.socialTwitter },
    { label: "LINKEDIN", href: settings.socialLinkedin },
  ].filter((social) => Boolean(social.href));

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[10001] -translate-y-24 border-2 border-ember bg-void px-4 py-2 text-xs tracking-[0.2em] text-bone transition-transform focus-visible:translate-y-0"
      >
        SKIP TO MAIN CONTENT
      </a>
      <TitleTypewriter
        brandName={primaryBrandName}
        brandAliases={brandAliases}
      />
      <LinkClickTracker />
      <BackgroundContextMenu />
      <Navigation brandName={primaryBrandName} brandAliases={brandAliases} />
      <main id="main-content" className="flex-1 scroll-mt-20">
        <PublicTransitionSurface>
          {children}
        </PublicTransitionSurface>
      </main>
      <Footer
        brandName={primaryBrandName}
        brandAliases={brandAliases}
        socials={footerSocials}
        legalEffectiveDate={settings.legalEffectiveDate}
        chucklesGifUrl={settings.footerChucklesGifUrl}
      />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  );
}
