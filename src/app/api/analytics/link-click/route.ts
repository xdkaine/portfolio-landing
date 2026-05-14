import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getLinkClickMetrics, recordLinkClick } from "@/lib/linkClickMetrics";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`link-click:${ip}`, 400, 60 * 60 * 1000);
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
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getLinkClickMetrics());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch link click metrics" },
      { status: 500 },
    );
  }
}
