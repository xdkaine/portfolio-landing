import { createPublicPageMetadata } from "@/lib/v2/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "Contact",
  description:
    "Get in touch about software engineering work, product builds, collaborations, or other projects.",
  path: "/v2/contact",
  imageAlt: "Contact page for project and collaboration inquiries.",
});

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
