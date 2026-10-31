import { trafficFilter } from "@/lib/analyticsTraffic";
import { visitorReport } from "@/lib/visitorStore";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/requestSecurity";
import { analyticsReport } from "@/lib/analyticsStore";
import { cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const traffic = trafficFilter(new URL(request.url).searchParams.get("traffic"));
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (![7, 30, 90].includes(days))
    return NextResponse.json(
      { error: "Choose 7, 30 or 90 days" },
      { status: 400 },
    );
  try {
    const [report, audience] = await Promise.all([
      analyticsReport(days, traffic),
      visitorReport(days, traffic),
    ]);
    return NextResponse.json(
      { ...report, audience },
      {
        headers: PRIVATE_API_HEADERS,
      },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
