import { COOKIE_NAME } from "@/lib/sessionToken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminOidcConfig, mappedAdminId } from "@/lib/oidcConfig";
import { isAdminProviderSessionLive } from "@/lib/oidcSession";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import {
  testAccessEnabled,
  requireTestOrigin,
  testCookieOptions,
  testResponseHeaders,
} from "@/lib/testAccess";
import {
  canConsumeGrant,
  isGrantId,
  matchesProof,
  openTestIdentity,
  sealTestIdentity,
  TEST_ACCESS_COOKIE,
  TEST_ACCESS_SCOPE,
  TEST_APPROVAL_COOKIE,
  TEST_REQUEST_COOKIE,
} from "@/lib/testAccessPolicy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!testAccessEnabled()) return new NextResponse(null, { status: 404 });
  const denied = requireTestOrigin(request);
  if (denied) return denied;
  if (
    !checkRateLimit(`test-complete:${getRequestIp(request)}`, 60, 60000).allowed
  )
    return NextResponse.json(
      { error: "Try again later" },
      { status: 429, headers: testResponseHeaders },
    );
  const { id } = await params;
  if (!isGrantId(id)) return new NextResponse(null, { status: 404 });
  const jar = await cookies(),
    proof = jar.get(TEST_REQUEST_COOKIE)?.value;
  const grant = await prisma.testAccessGrant.findUnique({ where: { id } });
  if (!proof || !grant || !matchesProof(proof, grant.proofHash))
    return NextResponse.json(
      { error: "Request unavailable" },
      { status: 404, headers: testResponseHeaders },
    );
  if (grant.scope !== TEST_ACCESS_SCOPE) return NextResponse.json({ error: "Create a new admin approval request." }, { status: 410, headers: testResponseHeaders });
  if (grant.state === "PENDING" && grant.expiresAt > new Date())
    return NextResponse.json(
      { status: "pending" },
      { status: 202, headers: testResponseHeaders },
    );
  if (!canConsumeGrant(grant, proof))
    return NextResponse.json(
      {
        error:
          "Request expired, denied, revoked or already used. Create a new request.",
      },
      { status: 410, headers: testResponseHeaders },
    );
  try {
    const identity = await openTestIdentity(
      "approval-identity",
      grant.identityCiphertext!,
    );
    const config = adminOidcConfig();
    if (
      identity.grantId !== id ||
      identity.userId !== grant.approvedById ||
      mappedAdminId(config, identity.oidc.subject) !== identity.userId ||
      !(await isAdminProviderSessionLive(config, identity.oidc))
    )
      throw Error("Approval unavailable");
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") throw Error("Approval unavailable");
    const token = await sealTestIdentity(
      "admin-session",
      identity,
      Math.floor(grant.sessionExpiresAt!.getTime() / 1000),
    );
    const consumed = await prisma.testAccessGrant.updateMany({
      where: {
        id,
        state: "APPROVED",
        scope: TEST_ACCESS_SCOPE,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        sessionExpiresAt: { gt: new Date() },
        proofHash: grant.proofHash,
      },
      data: { consumedAt: new Date(), identityCiphertext: null },
    });
    if (consumed.count !== 1) throw Error("Request already used");
    // A requester must not silently keep a longer owner login alongside this
    // deliberately short grant. This clears only this app/browser's cookies.
    jar.delete(COOKIE_NAME);
    jar.delete(TEST_APPROVAL_COOKIE);
    jar.set(TEST_ACCESS_COOKIE, token, {
      ...testCookieOptions,
      maxAge: Math.max(
        0,
        Math.floor((grant.sessionExpiresAt!.getTime() - Date.now()) / 1000),
      ),
    });
    jar.delete(TEST_REQUEST_COOKIE);
    return NextResponse.json(
      { status: "approved", destination: "/v1/admin" },
      { headers: testResponseHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Approval unavailable. Create a new request." },
      { status: 403, headers: testResponseHeaders },
    );
  }
}
