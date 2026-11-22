import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/requestSecurity";
import { cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return NextResponse.json(
      await prisma.cmsAuditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
