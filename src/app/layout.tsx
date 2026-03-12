import type { Metadata } from "next";
import { Anton, DM_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { LinkClickTracker } from "@/components/LinkClickTracker";
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
    <html lang="en" className={`${anton.variable} ${dmMono.variable}`}>
      <body className="flex flex-col min-h-screen">
        <TitleTypewriter
          brandName={primaryBrandName}
          brandAliases={brandAliases}
        />
        <LinkClickTracker />
        <Navigation brandName={primaryBrandName} brandAliases={brandAliases} />
        <main className="flex-1">{children}</main>
        <Footer
          brandName={primaryBrandName}
          brandAliases={brandAliases}
          socials={footerSocials}
          legalEffectiveDate={settings.legalEffectiveDate}
        />
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
