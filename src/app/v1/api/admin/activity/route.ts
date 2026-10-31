import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/requestSecurity";
import { cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
import { VISITOR_RETENTION_DAYS } from "@/lib/visitorIdentity";
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const cutoff = Date.now() - VISITOR_RETENTION_DAYS * 86_400_000;
    const items = await prisma.cmsAuditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(
      items.map(item => item.entity === "visitor" && item.createdAt.getTime() < cutoff ? { ...item, entityId: "" } : item),
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
