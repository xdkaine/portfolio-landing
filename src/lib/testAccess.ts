import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import {
  adminOidcConfig,
} from "@/lib/oidcConfig";
import { COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import {
  TEST_APPROVAL_COOKIE,
  TEST_REQUEST_COOKIE,
  matchesProof,
  verifyOwnerReceipt,
} from "@/lib/testAccessPolicy";

import { approvedAdminSessionsEnabled } from "@/lib/approvedAdminSession";
export const testAccessEnabled = approvedAdminSessionsEnabled;
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
export async function isRequestingBrowser(grantId: string) {
  const proof = (await cookies()).get(TEST_REQUEST_COOKIE)?.value;
  if (!proof) return false;
  const grant = await prisma.testAccessGrant.findUnique({ where: { id: grantId }, select: { proofHash: true } });
  return Boolean(grant && matchesProof(proof, grant.proofHash));
}

export async function verifiedApprovalOwner(grantId: string) {
  if (!testAccessEnabled() || await isRequestingBrowser(grantId)) return null;
  const session = await verifySession();
  if (!session || session.role !== "ADMIN" || session.approvedTestSession) return null;
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
