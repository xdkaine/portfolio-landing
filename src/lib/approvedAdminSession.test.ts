import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { EncryptJWT } from "jose";
import { approvedAdminSessionsEnabled, resolveApprovedAdminSession, type ApprovedAdminGrant } from "@/lib/approvedAdminSession";
import { sealTestIdentity, TEST_ACCESS_SCOPE } from "@/lib/testAccessPolicy";
import { signSessionToken } from "@/lib/sessionToken";

const saved = { secret: process.env.JWT_SECRET, mode: process.env.ADMIN_AUTH_MODE, flag: process.env.ENABLE_APPROVED_ADMIN_SESSIONS, legacyFlag: process.env.ENABLE_APPROVED_TEST_SESSIONS };
test.before(() => { process.env.JWT_SECRET = "approved-admin-real-crypto-test-secret-at-least-32"; });
test.after(() => {
  for (const [key, value] of Object.entries({ JWT_SECRET: saved.secret, ADMIN_AUTH_MODE: saved.mode, ENABLE_APPROVED_ADMIN_SESSIONS: saved.flag, ENABLE_APPROVED_TEST_SESSIONS: saved.legacyFlag })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function fixture() {
  const now = Date.now();
  const identity = { grantId: randomUUID(), userId: "owner", oidc: { subject: "owner-subject", sid: "owner-mfa-session", expiresAt: Math.floor(now / 1000) + 3600 } };
  const grant: ApprovedAdminGrant = { id: identity.grantId, scope: TEST_ACCESS_SCOPE, state: "APPROVED", approvedById: "owner", approvedAt: new Date(now - 1000), sessionExpiresAt: new Date(Math.floor(now / 1000) * 1000 + 300000), consumedAt: new Date(now) };
  const user = { id: "owner", email: "owner@example.test", name: "Test owner", role: "ADMIN" };
  const deps = { enabled: true, loadGrant: async () => grant, loadUser: async () => user, mappedUserId: () => "owner", providerSessionLive: async () => true };
  return { identity, grant, user, deps };
}
test("real admin access requires its new flag and OIDC; the old verification flag cannot enable it", () => {
  process.env.ADMIN_AUTH_MODE = "oidc";
  process.env.ENABLE_APPROVED_TEST_SESSIONS = "true";
  delete process.env.ENABLE_APPROVED_ADMIN_SESSIONS;
  assert.equal(approvedAdminSessionsEnabled(), false);
  process.env.ENABLE_APPROVED_ADMIN_SESSIONS = "true";
  assert.equal(approvedAdminSessionsEnabled(), true);
  process.env.ADMIN_AUTH_MODE = "local";
  assert.equal(approvedAdminSessionsEnabled(), false);
});
test("a consumed owner-approved encrypted session authenticates as the existing ADMIN with its grant expiry", async () => {
  const { identity, grant, deps } = fixture();
  const token = await sealTestIdentity("admin-session", identity, Math.floor(grant.sessionExpiresAt!.getTime() / 1000));
  assert.deepEqual(await resolveApprovedAdminSession(token, deps), { userId: "owner", email: "owner@example.test", name: "Test owner", role: "ADMIN", approvedTestSession: { grantId: grant.id, expiresAt: grant.sessionExpiresAt!.toISOString() } });
  assert.equal(await resolveApprovedAdminSession(await signSessionToken("owner", "ADMIN", identity.oidc), deps), null);
  assert.equal(await resolveApprovedAdminSession(await sealTestIdentity("approval-identity", identity, Math.floor(grant.sessionExpiresAt!.getTime() / 1000)), deps), null);
});
test("every request rechecks grant revocation, scope, consumption, current role, binding and live provider MFA", async () => {
  const { identity, grant, user, deps } = fixture();
  const token = await sealTestIdentity("admin-session", identity, Math.floor(grant.sessionExpiresAt!.getTime() / 1000));
  assert(await resolveApprovedAdminSession(token, deps));
  for (const change of [
    { state: "REVOKED" }, { state: "PENDING" }, { state: "DENIED" }, { scope: "portfolio:verify" },
    { consumedAt: null }, { approvedAt: null }, { approvedById: "someone-else" }, { id: randomUUID() },
    { sessionExpiresAt: new Date(1) }, { sessionExpiresAt: null },
    { sessionExpiresAt: new Date(grant.approvedAt!.getTime() + 601000) },
  ]) assert.equal(await resolveApprovedAdminSession(token, { ...deps, loadGrant: async () => ({ ...grant, ...change }) }), null);
  grant.state = "REVOKED";
  assert.equal(await resolveApprovedAdminSession(token, deps), null);
  grant.state = "APPROVED";
  user.role = "EDITOR";
  assert.equal(await resolveApprovedAdminSession(token, deps), null);
  user.role = "ADMIN";
  assert.equal(await resolveApprovedAdminSession(token, { ...deps, mappedUserId: () => null }), null);
  assert.equal(await resolveApprovedAdminSession(token, { ...deps, providerSessionLive: async () => false }), null);
  assert.equal(await resolveApprovedAdminSession(token, { ...deps, loadGrant: async () => { throw Error("database unavailable"); } }), null);
  assert.equal(await resolveApprovedAdminSession(token, { ...deps, enabled: false, loadGrant: async () => { assert.fail("disabled access must not read grants"); } }), null);
});
test("legacy read-only tokens remain invalid even when their old encryption key and grant ID are valid", async () => {
  const { identity, grant, deps } = fixture();
  const key = createHash("sha256").update(`portfolio-test-access:verification:v1\0${process.env.JWT_SECRET}`).digest();
  const legacy = await new EncryptJWT({ ...identity, scope: "portfolio:verify" }).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuer("portfolio-landing").setAudience("portfolio-test-verification").setIssuedAt().setExpirationTime("5m").encrypt(key);
  assert.equal(await resolveApprovedAdminSession(legacy, deps), null);
  const token = await sealTestIdentity("admin-session", identity, Math.floor(grant.sessionExpiresAt!.getTime() / 1000));
  grant.scope = "portfolio:verify";
  assert.equal(await resolveApprovedAdminSession(token, deps), null);
});

test("the proxy permits only the new encrypted admin purpose when enabled, leaving final authorization to the server layout", async t => {
  const oldMode = process.env.ADMIN_AUTH_MODE, oldFlag = process.env.ENABLE_APPROVED_ADMIN_SESSIONS;
  t.after(() => {
    if (oldMode === undefined) delete process.env.ADMIN_AUTH_MODE; else process.env.ADMIN_AUTH_MODE = oldMode;
    if (oldFlag === undefined) delete process.env.ENABLE_APPROVED_ADMIN_SESSIONS; else process.env.ENABLE_APPROVED_ADMIN_SESSIONS = oldFlag;
  });
  process.env.ADMIN_AUTH_MODE = "oidc";
  const { identity, grant } = fixture();
  const expiry = Math.floor(grant.sessionExpiresAt!.getTime() / 1000);
  const token = await sealTestIdentity("admin-session", identity, expiry);
  const request = (value: string) => new NextRequest("https://portfolio.example.test/v1/admin", { headers: { cookie: `portfolio-test-access=${value}` } });
  delete process.env.ENABLE_APPROVED_ADMIN_SESSIONS;
  assert.equal((await proxy(request(token))).status, 307);
  process.env.ENABLE_APPROVED_ADMIN_SESSIONS = "true";
  assert.equal((await proxy(request(token))).headers.get("x-middleware-next"), "1");
  assert.equal((await proxy(request(await sealTestIdentity("approval-identity", identity, expiry)))).status, 307);
  assert.equal((await proxy(request("not-a-token"))).status, 307);
});
