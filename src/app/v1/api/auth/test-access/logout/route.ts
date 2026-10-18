import { NextResponse } from "next/server";
import { destroyApprovedAdminSession } from "@/lib/auth";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { requireTestOrigin, testAccessEnabled, testResponseHeaders } from "@/lib/testAccess";
export async function POST(request: Request) {
  if (!testAccessEnabled()) return new NextResponse(null, { status: 404 });
  const denied = requireTestOrigin(request);
  if (denied) return denied;
  await destroyApprovedAdminSession();
  return NextResponse.redirect(new URL("/v1/test-access", adminOidcConfig().origin), { status: 303, headers: testResponseHeaders });
}
