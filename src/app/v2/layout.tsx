import type { Metadata } from "next";
import { PORTFOLIO_NAME, PORTFOLIO_TITLE, DEFAULT_SOCIAL_IMAGE } from "@/lib/v2/siteMetadata";
import "./v2.css";
import { Navigation } from "@/components/v2/Navigation";
import { PublicMotionRoot } from "@/components/v2/PublicTransition";
import { Footer } from "@/components/v2/Footer";
import { LinkClickTracker } from "@/components/LinkClickTracker";
import { parseIdentityAliases } from "@/lib/brandAliases";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function V2Layout({
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
    <div data-portfolio-v2 className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[10001] -translate-y-24 border-2 border-ember bg-void px-4 py-2 text-xs tracking-[0.2em] text-bone transition-transform focus-visible:translate-y-0"
      >
        SKIP TO MAIN CONTENT
      </a>
      <LinkClickTracker />
      <Navigation brandName={primaryBrandName} brandAliases={brandAliases} />
      <PublicMotionRoot>
        {children}
      </PublicMotionRoot>
      <Footer
        brandName={primaryBrandName}
        brandAliases={brandAliases}
        socials={footerSocials}
        chucklesGifUrl={settings.footerChucklesGifUrl}
      />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { default: PORTFOLIO_TITLE, template: `%s | ${PORTFOLIO_NAME}` },
    description: settings.siteDescription,
    alternates: { canonical: "/v2", types: { "application/rss+xml": [{ url: "/v2/feed.xml", title: `${settings.siteName} Blog posts RSS Feed` }] } },
    openGraph: { type: "website", title: PORTFOLIO_TITLE, description: settings.siteDescription, url: "/v2", images: [DEFAULT_SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title: PORTFOLIO_TITLE, description: settings.siteDescription, images: [DEFAULT_SOCIAL_IMAGE] },
  };
}
