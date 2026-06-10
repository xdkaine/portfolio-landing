import { createPublicPageMetadata } from "@/lib/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "Contact | Start a Conversation",
  description:
    "Get in touch about software engineering work, product builds, collaborations, or other projects.",
  path: "/v1/contact",
  imageAlt: "Contact page for project and collaboration inquiries.",
});

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
