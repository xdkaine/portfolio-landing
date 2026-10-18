import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { assertJwtSecretConfiguration } from "../../runtime-config.mjs";
import {
  validProviderSession,
  type AdminProviderSession,
} from "@/lib/oidcSession";

export const TEST_ACCESS_SECONDS = 600;
export const OWNER_APPROVAL_SECONDS = 300;
export const TEST_REQUEST_COOKIE = "portfolio-test-request";
export const TEST_ACCESS_COOKIE = "portfolio-test-access";
export const TEST_APPROVAL_COOKIE = "portfolio-test-owner-approval";
export const TEST_ACCESS_SCOPE = "portfolio:admin:test";
export const isGrantId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
export const newRequestProof = () => randomBytes(32).toString("base64url");
export const proofDigest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function matchesProof(value: string, digest: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value) || !/^[a-f0-9]{64}$/.test(digest))
    return false;
  return timingSafeEqual(
    Buffer.from(proofDigest(value), "hex"),
    Buffer.from(digest, "hex"),
  );
}
type TokenKind = "approval-identity" | "admin-session" | "owner-receipt";
function encryptionKey(kind: TokenKind) {
  assertJwtSecretConfiguration();
  return createHash("sha256")
    .update(`portfolio-test-access:${kind}:v1\0${process.env.JWT_SECRET}`)
    .digest();
}
async function seal(
  kind: TokenKind,
  payload: Record<string, unknown>,
  expiresAt: number,
) {
  if (
    !Number.isInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000) ||
    expiresAt > Math.floor(Date.now() / 1000) + TEST_ACCESS_SECONDS
  )
    throw new Error("Invalid expiry");
  return new EncryptJWT({ ...payload, scope: TEST_ACCESS_SCOPE })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuer("portfolio-landing")
    .setAudience(`portfolio-test-${kind}`)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .encrypt(encryptionKey(kind));
}
async function open(kind: TokenKind, token: string) {
  if (token.length > 4096) throw new Error("Invalid token");
  const { payload } = await jwtDecrypt(token, encryptionKey(kind), {
    issuer: "portfolio-landing",
    audience: `portfolio-test-${kind}`,
    keyManagementAlgorithms: ["dir"],
    contentEncryptionAlgorithms: ["A256GCM"],
  });
  if (
    payload.scope !== TEST_ACCESS_SCOPE ||
    !isGrantId(payload.grantId) ||
    typeof payload.userId !== "string" ||
    !payload.userId
  )
    throw new Error("Invalid approval");
  return payload;
}
export interface ApprovedTestIdentity {
  grantId: string;
  userId: string;
  oidc: AdminProviderSession;
}
export async function sealTestIdentity(
  kind: "approval-identity" | "admin-session",
  identity: ApprovedTestIdentity,
  expiresAt: number,
) {
  if (
    !isGrantId(identity.grantId) ||
    !identity.userId ||
    !validProviderSession(identity.oidc) ||
    expiresAt > identity.oidc.expiresAt
  )
    throw new Error("Invalid identity");
  return seal(kind, { ...identity }, expiresAt);
}
export async function openTestIdentity(
  kind: "approval-identity" | "admin-session",
  token: string,
): Promise<ApprovedTestIdentity> {
  const payload = await open(kind, token);
  if (!validProviderSession(payload.oidc))
    throw new Error("Invalid provider session");
  return {
    grantId: payload.grantId as string,
    userId: payload.userId as string,
    oidc: payload.oidc as AdminProviderSession,
  };
}
export async function sealOwnerReceipt(
  grantId: string,
  userId: string,
  ownerToken: string,
) {
  return seal(
    "owner-receipt",
    { grantId, userId, ownerTokenHash: proofDigest(ownerToken) },
    Math.floor(Date.now() / 1000) + OWNER_APPROVAL_SECONDS,
  );
}
export async function verifyOwnerReceipt(
  receipt: string,
  grantId: string,
  userId: string,
  ownerToken: string,
) {
  try {
    const payload = await open("owner-receipt", receipt);
    return (
      payload.grantId === grantId &&
      payload.userId === userId &&
      payload.ownerTokenHash === proofDigest(ownerToken)
    );
  } catch {
    return false;
  }
}
export interface ConsumableGrant {
  scope: string;
  proofHash: string;
  state: string;
  expiresAt: Date;
  sessionExpiresAt: Date | null;
  consumedAt: Date | null;
  identityCiphertext: string | null;
}
export function canConsumeGrant(
  grant: ConsumableGrant,
  proof: string,
  now = new Date(),
) {
  return (
    grant.scope === TEST_ACCESS_SCOPE &&
    matchesProof(proof, grant.proofHash) &&
    grant.state === "APPROVED" &&
    grant.expiresAt > now &&
    Boolean(grant.sessionExpiresAt && grant.sessionExpiresAt > now) &&
    !grant.consumedAt &&
    Boolean(grant.identityCiphertext)
  );
}
