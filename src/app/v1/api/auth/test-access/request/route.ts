import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import {
  testAccessEnabled,
  requireTestOrigin,
  testCookieOptions,
  testResponseHeaders,
} from "@/lib/testAccess";
import {
  newRequestProof,
  proofDigest,
  TEST_REQUEST_COOKIE,
  TEST_ACCESS_SECONDS,
  TEST_ACCESS_SCOPE,
} from "@/lib/testAccessPolicy";

export async function POST(request: Request) {
  if (!testAccessEnabled()) return new NextResponse(null, { status: 404 });
  const denied = requireTestOrigin(request);
  if (denied) return denied;
  if (
    !checkRateLimit(`test-request:${getRequestIp(request)}`, 3, 900000)
      .allowed ||
    !checkRateLimit("test-request:global", 100, 900000).allowed
  )
    return NextResponse.json(
      { error: "Try again later" },
      {
        status: 429,
        headers: { ...testResponseHeaders, "Retry-After": "900" },
      },
    );
  const proof = newRequestProof(),
    now = new Date();
  const grant = await prisma.testAccessGrant.create({
    data: {
      id: randomUUID(),
      scope: TEST_ACCESS_SCOPE,
      proofHash: proofDigest(proof),
      displayCode: randomBytes(4).toString("hex").toUpperCase(),
      expiresAt: new Date(now.getTime() + TEST_ACCESS_SECONDS * 1000),
    },
  });
  (await cookies()).set(TEST_REQUEST_COOKIE, proof, testCookieOptions);
  return NextResponse.json(
    {
      id: grant.id,
      displayCode: grant.displayCode,
      expiresAt: grant.expiresAt,
      approvalUrl: `${adminOidcConfig().origin}/v1/test-access/approve/${grant.id}`,
    },
    { headers: testResponseHeaders },
  );
}
