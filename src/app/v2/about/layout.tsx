import { createPublicPageMetadata } from "@/lib/v2/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "About",
  description:
    "Meet Thomas Phao, a builder and developer working across applications and the infrastructure behind them.",
  path: "/v2/about",
  imageAlt: "About Thomas Phao, builder and developer.",
});

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
