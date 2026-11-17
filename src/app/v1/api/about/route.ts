import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { ABOUT_SETTING_KEY, getAboutContent } from "@/lib/aboutStore";
import { parseAboutContent } from "@/lib/aboutContent";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json(await getAboutContent()); }
  catch { return NextResponse.json({ error: "About content could not be loaded." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const denied = await requireAdminMutation(request); if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send valid About content." }, { status: 400 }); }
  let content;
  try { content = parseAboutContent(body.content); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid About content." }, { status: 400 }); }
  try {
    const saved = await prisma.$transaction(async tx => {
      if (body.version === null) {
        const existing = await tx.siteSetting.findUnique({ where: { key: ABOUT_SETTING_KEY } });
        if (existing) return false;
        return tx.siteSetting.create({ data: { key: ABOUT_SETTING_KEY, value: JSON.stringify(content) } });
      }
      if (typeof body.version !== "string" || !Number.isFinite(Date.parse(body.version))) return false;
      const result = await tx.siteSetting.updateMany({ where: { key: ABOUT_SETTING_KEY, updatedAt: new Date(body.version) }, data: { value: JSON.stringify(content) } });
      return result.count === 1 ? tx.siteSetting.findUniqueOrThrow({ where: { key: ABOUT_SETTING_KEY } }) : false;
    });
    if (!saved) return NextResponse.json({ error: "About was edited elsewhere. Reload before saving to preserve those changes." }, { status: 409 });
    return NextResponse.json({ content, version: saved.updatedAt.toISOString() });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "About was edited elsewhere. Reload before saving." }, { status: 409 });
    return NextResponse.json({ error: "About could not be saved. Your changes are still in the editor." }, { status: 500 });
  }
}
