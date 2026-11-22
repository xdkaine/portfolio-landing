import type { Metadata, Viewport } from "next";
import fonts from "../../public/fonts/manifest.json";
import "./fonts.css";
import "./globals.css";

const fontPreloads = fonts.assets.filter(font => font.preload && ["Anton", "DM Mono", "Literata"].includes(font.family));

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
  const { getSiteSettings } = await import("@/lib/siteSettings");
  const { DEFAULT_SOCIAL_IMAGE, PORTFOLIO_NAME, PORTFOLIO_TITLE } = await import(
    "@/lib/siteMetadata"
  );
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl();
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const fullTitle = PORTFOLIO_TITLE;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: fullTitle, template: `%s | ${PORTFOLIO_NAME}` },
    description: settings.siteDescription,
    applicationName: `${settings.siteName} Portfolio`,
    authors: [{ name: PORTFOLIO_NAME, url: siteUrl }],
    creator: PORTFOLIO_NAME,
    publisher: settings.siteName,
    referrer: "strict-origin-when-cross-origin",
    alternates: {
      canonical: "/v1",
      types: {
        "application/rss+xml": [
          { url: "/v1/feed.xml", title: `${settings.siteName} Blog posts RSS Feed` },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {fontPreloads.map(font => <link key={font.path} rel="preload" href={font.path} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <meta name="theme-color" content="#0A0A0A" data-site-theme-color="true" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
