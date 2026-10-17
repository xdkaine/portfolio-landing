import { cookies } from "next/headers";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { NextResponse } from "next/server";
import {
  requireTestOrigin,
  testAccessEnabled,
  testResponseHeaders,
} from "@/lib/testAccess";
import {
  openTestIdentity,
  TEST_ACCESS_COOKIE,
  TEST_REQUEST_COOKIE,
} from "@/lib/testAccessPolicy";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  if (!testAccessEnabled()) return new NextResponse(null, { status: 404 });
  const denied = requireTestOrigin(request);
  if (denied) return denied;
  const jar = await cookies(),
    token = jar.get(TEST_ACCESS_COOKIE)?.value;
  if (token) {
    let identity;
    try {
      identity = await openTestIdentity("verification", token);
    } catch {
      identity = null;
    }
    if (identity)
      await prisma.testAccessGrant.updateMany({
        where: {
          id: identity.grantId,
          approvedById: identity.userId,
          state: "APPROVED",
        },
        data: { state: "REVOKED", identityCiphertext: null },
      });
  }
  jar.delete(TEST_ACCESS_COOKIE);
  jar.delete(TEST_REQUEST_COOKIE);
  return NextResponse.redirect(
    new URL("/v1/test-access", adminOidcConfig().origin),
    { status: 303, headers: testResponseHeaders },
  );
}
