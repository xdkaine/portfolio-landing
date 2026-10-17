import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  adminOidcConfig,
  isAdminSsoEnabled,
  mappedAdminId,
} from "@/lib/oidcConfig";
import { isAdminProviderSessionLive } from "@/lib/oidcSession";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import {
  openTestIdentity,
  TEST_ACCESS_COOKIE,
  TEST_APPROVAL_COOKIE,
  verifyOwnerReceipt,
} from "@/lib/testAccessPolicy";

export function testAccessEnabled() {
  return (
    process.env.ENABLE_APPROVED_TEST_SESSIONS === "true" && isAdminSsoEnabled()
  );
}
export const testCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};
export const testResponseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
export function requireTestOrigin(request: Request) {
  if (
    request.headers.get("origin") !== adminOidcConfig().origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { error: "Same-origin request required" },
      { status: 403, headers: testResponseHeaders },
    );
  return null;
}
export async function verifiedApprovalOwner(grantId: string) {
  if (!testAccessEnabled()) return null;
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") return null;
  const jar = await cookies(),
    token = jar.get(COOKIE_NAME)?.value,
    receipt = jar.get(TEST_APPROVAL_COOKIE)?.value;
  if (
    !token ||
    !receipt ||
    !(await verifyOwnerReceipt(receipt, grantId, session.userId, token))
  )
    return null;
  const claims = await verifySessionToken(token);
  return claims?.oidc ? { userId: session.userId, oidc: claims.oidc } : null;
}
export async function approvedVerificationSession() {
  try {
    if (!testAccessEnabled()) return null;
    const token = (await cookies()).get(TEST_ACCESS_COOKIE)?.value;
    if (!token) return null;
    const identity = await openTestIdentity("verification", token);
    const [grant, user] = await Promise.all([
      prisma.testAccessGrant.findUnique({ where: { id: identity.grantId } }),
      prisma.user.findUnique({
        where: { id: identity.userId },
        select: { role: true },
      }),
    ]);
    if (
      !grant ||
      grant.state !== "APPROVED" ||
      !grant.consumedAt ||
      grant.approvedById !== identity.userId ||
      !grant.sessionExpiresAt ||
      grant.sessionExpiresAt <= new Date() ||
      user?.role !== "ADMIN"
    )
      return null;
    const config = adminOidcConfig();
    if (
      mappedAdminId(config, identity.oidc.subject) !== identity.userId ||
      !(await isAdminProviderSessionLive(config, identity.oidc))
    )
      return null;
    return { grantId: grant.id, expiresAt: grant.sessionExpiresAt };
  } catch {
    return null;
  }
}
