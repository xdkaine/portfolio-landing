import { PORTFOLIO_PROFILE } from "@/lib/portfolioProfile";
import { normalizePostDocument, type PostDocument } from "@/lib/postContent";

export interface AboutContent {
  title: string;
  currentRole: string;
  personalNote: string;
  location: string;
  focus: string;
  experience: string;
  status: string;
  bodyJson: PostDocument;
  techGroups: { category: string; items: string[] }[];
}
const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  title: "ABOUT THOMAS PHAO", currentRole: PORTFOLIO_PROFILE.currentRole, personalNote: PORTFOLIO_PROFILE.personalNote,
  location: PORTFOLIO_PROFILE.location, focus: "ENTERPRISE TECHNOLOGY, ERP & SUPPORTING SYSTEMS", experience: `${PORTFOLIO_PROFILE.experienceYears}+ YEARS`, status: "AVAILABLE",
  bodyJson: { type: "doc", content: [
    paragraph("I'm a developer who works across applications and infrastructure. The work I enjoy most is building and deploying systems that other people actually use. That can mean an application, the infrastructure behind it, or getting the two working together."),
    paragraph("I currently work as a Technology Risk Consultant, supporting work across enterprise technologies, ERP platforms, and the systems around them. Outside that role, I keep building applications and infrastructure, and use this site to share what I'm working on and learning."),
  ] },
  techGroups: [
    { category: "LANGUAGES", items: ["TypeScript", "Python", "Lua", "PHP", "SQL"] },
    { category: "FRONTEND", items: ["React", "Next.js", "Vue", "Tailwind"] },
    { category: "BACKEND", items: ["Node.js", "PostgreSQL", "Redis", "GraphQL"] },
    { category: "TOOLS", items: ["Git", "Docker", "Figma", "Linux"] },
  ],
};

export function parseAboutContent(input: unknown): AboutContent {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("About content must be an object.");
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 100_000) throw new Error("About content must be under 100 KB.");
  const data = input as Record<string, unknown>;
  const text = (name: string, max = 500) => {
    const value = data[name];
    if (typeof value !== "string" || value.length > max) throw new Error(`Check the ${name} field (maximum ${max} characters).`);
    return value.trim();
  };
  const bodyJson = normalizePostDocument(data.bodyJson);
  if (!bodyJson) throw new Error("About needs a valid content document.");
  if (!Array.isArray(data.techGroups) || data.techGroups.length > 12) throw new Error("Use up to 12 tech groups.");
  const techGroups = data.techGroups.map(group => {
    if (!group || typeof group !== "object" || typeof group.category !== "string" || group.category.length > 80 || !Array.isArray(group.items) || group.items.length > 30 || group.items.some((item: unknown) => typeof item !== "string" || item.length > 100)) throw new Error("Each tech group needs a name and up to 30 short items.");
    return { category: group.category.trim(), items: group.items.map((item: string) => item.trim()).filter(Boolean) };
  });
  return { title: text("title", 180), currentRole: text("currentRole", 180), personalNote: text("personalNote", 3000), location: text("location", 180), focus: text("focus"), experience: text("experience", 80), status: text("status", 80), bodyJson, techGroups };
}
