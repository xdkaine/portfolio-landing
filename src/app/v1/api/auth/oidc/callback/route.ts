import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeAdminLogin, OIDC_TRANSACTION_COOKIE } from "@/lib/adminOidc";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { isAdminProviderSessionLive } from "@/lib/oidcSession";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const jar = await cookies();
  const transaction = jar.get(OIDC_TRANSACTION_COOKIE)?.value;
  jar.delete(OIDC_TRANSACTION_COOKIE);
  try {
    const config = adminOidcConfig();
    if (!transaction) throw new Error("Missing login transaction");
    const identity = await completeAdminLogin(new URL(request.url), transaction, config);
    const user = await prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true, role: true } });
    if (!user || user.role !== "ADMIN" || !await isAdminProviderSessionLive(config, identity.providerSession)) {
      throw new Error("Admin access denied");
    }
    await createSession(user.id, user.role, identity.providerSession);
    return NextResponse.redirect(new URL("/v1/admin", config.origin), { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    // No provider error messages, codes, tokens, or credentials enter the response or logs.
    return new NextResponse(null, { status: 303, headers: {
      Location: "/v1/login?error=sso_failed", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    } });
  }
}
