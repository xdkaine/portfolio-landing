import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { beginAdminLogin, OIDC_TRANSACTION_COOKIE, OIDC_TRANSACTION_SECONDS } from "@/lib/adminOidc";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const limit = checkRateLimit(`oidc-start:${getRequestIp(request)}`, 15, 15 * 60 * 1000);
  if (!limit.allowed) return new NextResponse(null, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const config = adminOidcConfig();
    // Set the host-only transaction cookie on the registered callback host.
    // Production also serves www.phao.dev, which must enter SSO at the apex.
    if (request.headers.get("host")?.toLowerCase() !== new URL(config.origin).host) {
      return NextResponse.redirect(new URL("/v1/api/auth/oidc/start", config.origin), 303);
    }
    const flow = await beginAdminLogin(config);
    const jar = await cookies();
    jar.set(OIDC_TRANSACTION_COOKIE, flow.cookie, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: OIDC_TRANSACTION_SECONDS });
    const response = NextResponse.redirect(flow.authorizationUrl, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.json({ error: "Admin single sign-on is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
