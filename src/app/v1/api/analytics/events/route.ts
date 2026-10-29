import { NextResponse } from "next/server";
import { normalizeAnalyticsEvent } from "@/lib/analytics";
import { recordAnalytics } from "@/lib/analyticsStore";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { rejectCrossSiteMutation } from "@/lib/requestSecurity";
import { cmsErrorResponse, readJson } from "@/lib/cmsServer";
export async function POST(request: Request) {
  const denied = rejectCrossSiteMutation(request);
  if (denied) return denied;
  if (
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    /bot|crawler|spider|headless|preview/i.test(
      request.headers.get("user-agent") ?? "",
    )
  )
    return new NextResponse(null, { status: 204 });
  const limit = checkRateLimit(
    `analytics:${getRequestIp(request)}`,
    300,
    60 * 60 * 1000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  try {
    const event = normalizeAnalyticsEvent(await readJson(request, 8192));
    if (!event)
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    await recordAnalytics(event);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
