import {
  cmsErrorResponse,
  readJson,
  PRIVATE_API_HEADERS,
} from "@/lib/cmsServer";
import { NextResponse } from "next/server";
import { getLinkClickMetrics, recordLinkClick } from "@/lib/linkClickMetrics";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import {
  rejectCrossSiteMutation,
  requireAdminApi,
} from "@/lib/requestSecurity";

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;

    if (
      request.headers.get("dnt") === "1" ||
      request.headers.get("sec-gpc") === "1" ||
      /bot|crawler|spider|headless|preview/i.test(
        request.headers.get("user-agent") ?? "",
      )
    )
      return new NextResponse(null, { status: 204 });
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`link-click:${ip}`, 300, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const recorded = await recordLinkClick(await readJson(request, 8192));
    if (!recorded) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function GET() {
  try {
    const denied = await requireAdminApi();
    if (denied) return denied;

    return NextResponse.json(await getLinkClickMetrics(), {
      headers: PRIVATE_API_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch link click metrics" },
      { status: 500 },
    );
  }
}
