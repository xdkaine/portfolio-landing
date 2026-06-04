import type { Metadata, Viewport } from "next";
import { Anton, DM_Mono, Literata } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { LinkClickTracker } from "@/components/LinkClickTracker";
import { BackgroundContextMenu } from "@/components/BackgroundContextMenu";
import { PublicTransitionSurface } from "@/components/PublicTransition";
import { parseBrandAliases } from "@/lib/brandAliases";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/siteMetadata";
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

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const themeInitializationScript = `
(function () {
  try {
    var preference = localStorage.getItem("site-theme");
    var explicitTheme = preference === "light" || preference === "dark";
    if (explicitTheme) {
      document.documentElement.setAttribute("data-theme", preference);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    var resolvedTheme = explicitTheme
      ? preference
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.style.colorScheme = resolvedTheme;
    var colorMeta = document.querySelector('meta[data-site-theme-color="true"]');
    if (colorMeta) {
      colorMeta.setAttribute("content", resolvedTheme === "light" ? "#F5F1E8" : "#0A0A0A");
    }
  } catch (error) {}
})();
`;

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
    applicationName: `${settings.siteName} Portfolio`,
    authors: [{ name: settings.siteName, url: siteUrl }],
    creator: settings.siteName,
    publisher: settings.siteName,
    referrer: "strict-origin-when-cross-origin",
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": [
          { url: "/feed.xml", title: `${settings.siteName} Transmissions RSS Feed` },
        ],
      },
    },
    openGraph: {
      title: fullTitle,
      description: settings.siteDescription,
      url: siteUrl,
      siteName: settings.siteName,
      locale: "en_US",
      type: "website",
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: settings.siteDescription,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    verification: googleVerification
      ? {
          google: googleVerification,
        }
      : undefined,
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
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
    <html lang="en" className={`${anton.variable} ${dmMono.variable} ${literata.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0A0A0A" data-site-theme-color="true" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
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
      </body>
    </html>
  );
}
