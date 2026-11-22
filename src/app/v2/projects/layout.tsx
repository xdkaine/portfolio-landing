import { createPublicPageMetadata } from "@/lib/v2/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "Projects",
  description:
    "Project Showcase of systems, interfaces, and experiments I have built and shipped, with write-ups, concepts, visuals, and demo links.",
  path: "/v2/projects",
  imageAlt: "Software project showcase and build notes.",
});

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
