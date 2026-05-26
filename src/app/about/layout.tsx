import { createPublicPageMetadata } from "@/lib/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "About | Systems Engineer",
  description:
    "About a systems engineer and full-stack developer focused on performant software, thoughtful interfaces, and practical design.",
  path: "/about",
  imageAlt: "About the systems engineer behind this portfolio.",
});

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
