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

    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`link-click:${ip}`, 60, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const recorded = await recordLinkClick(await request.json());
    if (!recorded) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const denied = await requireAdminApi();
    if (denied) return denied;

    return NextResponse.json(await getLinkClickMetrics());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch link click metrics" },
      { status: 500 },
    );
  }
}
