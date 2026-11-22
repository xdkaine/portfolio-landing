import { PublicChrome } from "@/components/PublicChrome";
import { Navigation } from "@/components/Navigation";
import { PublicMotionRoot } from "@/components/PublicTransition";
import { Footer } from "@/components/Footer";
import { LinkClickTracker } from "@/components/LinkClickTracker";
import { parseIdentityAliases } from "@/lib/brandAliases";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function V1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const brandAliases = parseIdentityAliases(settings.siteAliases);
  const primaryBrandName = brandAliases[0] ?? settings.siteName;
  const footerSocials = [
    { label: "GITHUB", href: settings.socialGithub },
    { label: "TWITTER", href: settings.socialTwitter },
    { label: "LINKEDIN", href: settings.socialLinkedin },
  ].filter((social) => Boolean(social.href));

  return (
    <>
      <PublicChrome>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[10001] -translate-y-24 border-2 border-ember bg-void px-4 py-2 text-xs tracking-[0.2em] text-bone transition-transform focus-visible:translate-y-0"
      >
        SKIP TO MAIN CONTENT
      </a>
      <LinkClickTracker />
      <Navigation brandName={primaryBrandName} brandAliases={brandAliases} />
      </PublicChrome>
      <PublicMotionRoot>
        {children}
      </PublicMotionRoot>
      <PublicChrome><Footer
        brandName={primaryBrandName}
        brandAliases={brandAliases}
        socials={footerSocials}
        chucklesGifUrl={settings.footerChucklesGifUrl}
      /></PublicChrome>
    </>
  );
}
