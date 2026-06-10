import { createPublicPageMetadata } from "@/lib/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "About | Me! ",
  description:
    "About a systems engineer and full-stack developer focused on building anything and everything.",
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
