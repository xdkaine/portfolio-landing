import type { Metadata, Viewport } from "next";
import { Anton, DM_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { LinkClickTracker } from "@/components/LinkClickTracker";
import { BackgroundContextMenu } from "@/components/BackgroundContextMenu";
import { parseBrandAliases } from "@/lib/brandAliases";
import { getSiteSettings } from "@/lib/siteSettings";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

function resolveSiteUrl(): string {
  const fallback = "https://phao.dev";
  const raw = process.env.NEXT_PUBLIC_SITE_URL;

  if (!raw) return fallback;

  try {
    return new URL(raw).toString();
  } catch {
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl();
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const fullTitle = `${settings.siteName} - Developer & Designer`;

  return {
    metadataBase: new URL(siteUrl),
    title: fullTitle,
    description: settings.siteDescription,
    alternates: { canonical: "/" },
    openGraph: {
      title: fullTitle,
      description: settings.siteDescription,
      url: siteUrl,
      siteName: settings.siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: settings.siteDescription,
    },
    verification: googleVerification
      ? {
          google: googleVerification,
        }
      : undefined,
  };
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0A0A0A",
};

export default async function RootLayout({
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
    <html lang="en" className={`${anton.variable} ${dmMono.variable} [color-scheme:dark]`}>
      <body className="flex flex-col min-h-screen">
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
          {children}
        </main>
        <Footer
          brandName={primaryBrandName}
          brandAliases={brandAliases}
          socials={footerSocials}
          legalEffectiveDate={settings.legalEffectiveDate}
          chucklesGifUrl={settings.footerChucklesGifUrl}
        />
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
