import { createHash } from "node:crypto";
import { projectCover } from "@/lib/projectMedia";
import { getProjectTeaser } from "@/lib/projectTeaser";
import { DEFAULT_SITE_SETTINGS } from "@/lib/siteSettings-schema";
import type { ProjectCaseStudyContent } from "@/lib/projectCaseStudy";

export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 };
export const SOCIAL_SITE_NAME = "phao.dev";

export type SocialPreview = {
  kind: "Portfolio" | "Article" | "Project";
  title: string;
  description: string;
  image?: string | null;
};

export function compactPreviewText(value: string, limit: number): string {
  const text = value.trim().replace(/\s+/g, " ");
  const characters = Array.from(text);
  if (characters.length <= limit) return text;

  const prefix = characters.slice(0, limit - 1).join("");
  for (const match of prefix.matchAll(/[.!?](?=\s)/g)) {
    const sentence = prefix.slice(0, match.index + 1);
    if (sentence.length < limit / 2 || /\b(?:[A-Z]|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)\.$/.test(sentence)) continue;
    return sentence;
  }
  const lastSpace = prefix.lastIndexOf(" ");
  const words = lastSpace >= prefix.length / 2 ? prefix.slice(0, lastSpace) : prefix;
  return `${words.replace(/\s+[A-Z]\.$/, "").trimEnd()}…`;
}

export function homeSocialPreview(siteDescription: string): SocialPreview {
  const description = siteDescription.trim();
  return {
    kind: "Portfolio",
    title: "Thomas Phao",
    description: compactPreviewText(
      description && description !== DEFAULT_SITE_SETTINGS.siteDescription
        ? description
        : "I build web apps and run a homelab. Projects and field notes from both.",
      160,
    ),
    image: "/v2/uma-overview.png",
  };
}

export function postSocialPreview(post: { title: string; excerpt: string; coverImage?: string | null }): SocialPreview {
  return {
    kind: "Article",
    title: post.title,
    description: compactPreviewText(post.excerpt, 160),
    image: post.coverImage,
  };
}

export function projectSocialPreview(project: {
  title: string;
  description: string;
  caseStudy?: ProjectCaseStudyContent | null;
}): SocialPreview {
  return {
    kind: "Project",
    title: project.title,
    description: compactPreviewText(getProjectTeaser(project), 160),
    image: projectCover(project.caseStudy)?.image,
  };
}

export function socialCardMetadata(path: string, preview: SocialPreview) {
  const version = createHash("sha256")
    .update(JSON.stringify([1, preview]))
    .digest("hex")
    .slice(0, 12);
  return {
    ...SOCIAL_CARD_SIZE,
    url: `${path}/opengraph-image?v=${version}`,
    alt: [compactPreviewText(preview.title, 108), preview.description].filter(Boolean).join(" — "),
  };
}
