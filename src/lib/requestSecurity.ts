import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

function configuredSiteOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function rejectCrossSiteMutation(
  request: Request,
): NextResponse | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Cross-site request rejected" },
      { status: 403 },
    );
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 400 },
    );
  }

  const siteOrigin = configuredSiteOrigin();
  const allowedOrigins =
    process.env.NODE_ENV === "production" && siteOrigin
      ? new Set([siteOrigin])
      : new Set([requestOrigin, ...(siteOrigin ? [siteOrigin] : [])]);

  if (!allowedOrigins.has(origin)) {
    return NextResponse.json(
      { error: "Cross-site request rejected" },
      { status: 403 },
    );
  }

  return null;
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireAdminMutation(
  request: Request,
): Promise<NextResponse | null> {
  return rejectCrossSiteMutation(request) ?? requireAdminApi();
}
