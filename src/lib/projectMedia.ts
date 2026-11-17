import type { ProjectCaseStudyContent, ProjectCaseStudyGalleryItem } from "@/lib/projectCaseStudy";
import type { PostNode } from "@/lib/postContent";

export function projectCover(content: ProjectCaseStudyContent | null | undefined): ProjectCaseStudyGalleryItem | undefined {
  if (content?.gallery?.[0]) return content.gallery[0];
  const visit = (nodes: PostNode[]): ProjectCaseStudyGalleryItem | undefined => {
    for (const node of nodes) {
      if ((node.type === "image" || node.type === "mediaText") && typeof node.attrs?.src === "string") return { image: node.attrs.src, alt: String(node.attrs.alt ?? ""), caption: String(node.attrs.caption ?? ""), title: "" };
      const found = visit(node.content ?? []); if (found) return found;
    }
  };
  return visit(content?.bodyJson?.content ?? []);
}
