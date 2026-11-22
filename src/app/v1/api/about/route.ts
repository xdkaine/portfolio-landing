import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { ABOUT_SETTING_KEY, getAboutContent } from "@/lib/aboutStore";
import { parseAboutContent } from "@/lib/aboutContent";
import { cmsActor, cmsErrorResponse, readJson } from "@/lib/cmsServer";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json(await getAboutContent()); }
  catch { return NextResponse.json({ error: "About content could not be loaded." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const denied = await requireAdminMutation(request); if (denied) return denied;
  let body;
  try { body = await readJson(request); } catch (error) { return cmsErrorResponse(error); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Send valid About content." }, { status: 400 });
  const input = body as { content?: unknown; version?: unknown };
  let content;
  try { content = parseAboutContent(input.content); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid About content." }, { status: 400 }); }
  try {
    const actor = await cmsActor();
    const saved = await prisma.$transaction(async tx => {
      let row;
      if (input.version === null) {
        const existing = await tx.siteSetting.findUnique({ where: { key: ABOUT_SETTING_KEY } });
        if (existing) return false;
        row = await tx.siteSetting.create({ data: { key: ABOUT_SETTING_KEY, value: JSON.stringify(content) } });
      } else {
        if (typeof input.version !== "string" || !Number.isFinite(Date.parse(input.version))) return false;
        const result = await tx.siteSetting.updateMany({ where: { key: ABOUT_SETTING_KEY, updatedAt: new Date(input.version) }, data: { value: JSON.stringify(content) } });
        if (result.count !== 1) return false;
        row = await tx.siteSetting.findUniqueOrThrow({ where: { key: ABOUT_SETTING_KEY } });
      }
      await tx.cmsAuditEvent.create({ data: { actor, action: "saved", entity: "about", entityId: ABOUT_SETTING_KEY, summary: content.title.slice(0, 180) } });
      return row;
    });
    if (!saved) return NextResponse.json({ error: "About was edited elsewhere. Reload before saving to preserve those changes." }, { status: 409 });
    return NextResponse.json({ content, version: saved.updatedAt.toISOString() });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "About was edited elsewhere. Reload before saving." }, { status: 409 });
    return NextResponse.json({ error: "About could not be saved. Your changes are still in the editor." }, { status: 500 });
  }
}
