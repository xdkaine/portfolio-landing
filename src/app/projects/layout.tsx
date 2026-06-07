import { createPublicPageMetadata } from "@/lib/siteMetadata";

export const metadata = createPublicPageMetadata({
  title: "Projects | Build Notes",
  description:
    "Project Showcase of systems, interfaces, and experiments I have built and shipped, with write-ups, concepts, visuals, and demo links.",
  path: "/projects",
  imageAlt: "Software project showcase and build notes.",
});

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
