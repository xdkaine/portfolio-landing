export interface HomeStat {
  id: "projects" | "live" | "technologies" | "posts";
  label: string;
  value: number;
}

export function buildHomeStats(projects: { status: string; tags: string[] }[], publishedPosts: number): HomeStat[] {
  const technologies = new Set(projects.flatMap(project => project.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean)));
  return [
    { id: "projects", label: "Projects", value: projects.length },
    { id: "live", label: "Live projects", value: projects.filter(project => project.status === "LIVE").length },
    { id: "technologies", label: "Technologies", value: technologies.size },
    { id: "posts", label: "Blog posts", value: publishedPosts },
  ];
}
