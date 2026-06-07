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

function configuredSiteOrigins(): Set<string> {
  const siteOrigin = configuredSiteOrigin();
  if (!siteOrigin) return new Set();

  const origins = new Set([siteOrigin]);
  const siteUrl = new URL(siteOrigin);
  const hostname = siteUrl.hostname.toLowerCase();

  if (hostname.startsWith("www.")) {
    siteUrl.hostname = hostname.slice(4);
    origins.add(siteUrl.origin);
  } else if (hostname.split(".").length === 2) {
    siteUrl.hostname = `www.${hostname}`;
    origins.add(siteUrl.origin);
  }

  return origins;
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

  const siteOrigins = configuredSiteOrigins();
  const allowedOrigins =
    process.env.NODE_ENV === "production" && siteOrigins.size > 0
      ? siteOrigins
      : new Set([requestOrigin, ...siteOrigins]);

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
