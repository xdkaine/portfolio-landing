import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ABOUT_CONTENT, parseAboutContent } from "@/lib/aboutContent";

export const ABOUT_SETTING_KEY = "about_page_content";
export async function getAboutContent() {
  const row = await prisma.siteSetting.findUnique({ where: { key: ABOUT_SETTING_KEY } });
  return { content: row ? parseAboutContent(JSON.parse(row.value)) : DEFAULT_ABOUT_CONTENT, version: row?.updatedAt.toISOString() ?? null };
}
