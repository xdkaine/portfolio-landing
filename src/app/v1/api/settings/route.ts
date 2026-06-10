import { NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/siteSettings";
import { pickPublicSiteSettings } from "@/lib/siteSettings-schema";
import {
  requireAdminApi,
  requireAdminMutation,
} from "@/lib/requestSecurity";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "true";

    if (includeAll) {
      const denied = await requireAdminApi();
      if (denied) return denied;
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
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

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
