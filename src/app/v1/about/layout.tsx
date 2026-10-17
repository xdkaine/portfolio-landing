import { createPublicPageMetadata } from "@/lib/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "About — Systems Engineering & Development",
  description:
    "Meet Thomas Phao, a systems engineer and developer building reliable infrastructure and thoughtful web applications.",
  path: "/v1/about",
  imageAlt: "About the systems engineer behind this portfolio.",
});

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
