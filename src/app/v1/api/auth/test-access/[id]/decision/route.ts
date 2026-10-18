import { NextResponse } from "next/server";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { prisma } from "@/lib/prisma";
import {
  testAccessEnabled,
  requireTestOrigin,
  testResponseHeaders,
  verifiedApprovalOwner,
} from "@/lib/testAccess";
import {
  isGrantId,
  sealTestIdentity,
  TEST_ACCESS_SECONDS,
  TEST_ACCESS_SCOPE,
} from "@/lib/testAccessPolicy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!testAccessEnabled()) return new NextResponse(null, { status: 404 });
  const denied = requireTestOrigin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isGrantId(id)) return new NextResponse(null, { status: 404 });
  const owner = await verifiedApprovalOwner(id);
  if (!owner)
    return NextResponse.json(
      { error: "Fresh owner sign-in required" },
      { status: 403, headers: testResponseHeaders },
    );
  const form = await request.formData(),
    decision = form.get("decision");
  if (!["approve", "deny", "revoke"].includes(String(decision)))
    return new NextResponse(null, { status: 400 });
  const now = new Date();
  if (decision === "approve") {
    const expires = Math.min(
      Math.floor(Date.now() / 1000) + TEST_ACCESS_SECONDS,
      owner.oidc.expiresAt,
    );
    const identityCiphertext = await sealTestIdentity(
      "approval-identity",
      { grantId: id, ...owner },
      expires,
    );
    await prisma.testAccessGrant.updateMany({
      where: { id, scope: TEST_ACCESS_SCOPE, state: "PENDING", expiresAt: { gt: now } },
      data: {
        state: "APPROVED",
        approvedById: owner.userId,
        approvedAt: now,
        sessionExpiresAt: new Date(expires * 1000),
        identityCiphertext,
      },
    });
  } else if (decision === "deny") {
    await prisma.testAccessGrant.updateMany({
      where: { id, scope: TEST_ACCESS_SCOPE, state: "PENDING", expiresAt: { gt: now } },
      data: {
        state: "DENIED",
        approvedById: owner.userId,
        identityCiphertext: null,
      },
    });
  } else {
    await prisma.testAccessGrant.updateMany({
      where: { id, scope: TEST_ACCESS_SCOPE, state: "APPROVED", approvedById: owner.userId },
      data: { state: "REVOKED", identityCiphertext: null },
    });
  }
  return NextResponse.redirect(
    new URL(`/v1/test-access/approve/${id}`, adminOidcConfig().origin),
    { status: 303, headers: testResponseHeaders },
  );
}
