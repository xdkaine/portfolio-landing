import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/siteSettings";
import { pickPublicSiteSettings } from "@/lib/siteSettings-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "true";

    if (includeAll) {
      const session = await verifySession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const settings = await getSiteSettings();
    return NextResponse.json(
      includeAll ? settings : pickPublicSiteSettings(settings),
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const settings = await updateSiteSettings(body);

    if (!settings) {
      return NextResponse.json(
        { error: "No valid settings provided" },
        { status: 400 },
      );
    }

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

