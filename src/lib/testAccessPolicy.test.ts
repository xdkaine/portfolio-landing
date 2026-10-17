import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EncryptJWT, generateKeyPair, exportJWK, SignJWT } from "jose";
import {
  canConsumeGrant,
  isGrantId,
  matchesProof,
  newRequestProof,
  openTestIdentity,
  proofDigest,
  sealOwnerReceipt,
  sealTestIdentity,
  verifyOwnerReceipt,
  type ConsumableGrant,
} from "@/lib/testAccessPolicy";
import { verifySessionToken } from "@/lib/sessionToken";
import { adminOidcConfig } from "@/lib/oidcConfig";
import {
  beginAdminLogin,
  completeAdminLogin,
  openLoginTransaction,
  sealLoginTransaction,
} from "@/lib/adminOidc";
import * as oidc from "openid-client";
const previous = process.env.JWT_SECRET;
test.before(() => {
  process.env.JWT_SECRET = "test-owner-approval-secret-at-least-32-characters";
});
test.after(() => {
  if (previous === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous;
});
const providerSession = {
  subject: "approved-owner",
  sid: "provider-session-123",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};
const config = adminOidcConfig({
  ADMIN_AUTH_MODE: "oidc",
  NEXT_PUBLIC_SITE_URL: "https://portfolio.example.com",
  OIDC_CLIENT_ID: "test",
  OIDC_CLIENT_SECRET: "test-client-secret-with-at-least-32-characters",
  OIDC_ADMIN_BINDINGS: JSON.stringify({ "approved-owner": "owner" }),
});
test("test request proofs are random and hashed; wrong browsers and malformed proofs fail", () => {
  const a = newRequestProof(),
    b = newRequestProof();
  assert.notEqual(a, b);
  assert.equal(a.length, 43);
  assert(matchesProof(a, proofDigest(a)));
  assert(!matchesProof(b, proofDigest(a)));
  assert(!matchesProof("", proofDigest(a)));
  assert(!matchesProof(a, "invalid"));
  assert(!proofDigest(a).includes(a));
});
test("only unconsumed approved requests with the matching browser proof can be redeemed", () => {
  const proof = newRequestProof();
  const grant: ConsumableGrant = {
    proofHash: proofDigest(proof),
    state: "APPROVED",
    expiresAt: new Date(Date.now() + 60000),
    sessionExpiresAt: new Date(Date.now() + 60000),
    consumedAt: null,
    identityCiphertext: "encrypted",
  };
  assert(canConsumeGrant(grant, proof));
  for (const change of [
    { state: "PENDING" },
    { state: "DENIED" },
    { state: "REVOKED" },
    { expiresAt: new Date(1) },
    { sessionExpiresAt: new Date(1) },
    { sessionExpiresAt: null },
    { consumedAt: new Date() },
    { identityCiphertext: null },
  ])
    assert(!canConsumeGrant({ ...grant, ...change }, proof));
  assert(!canConsumeGrant(grant, newRequestProof()));
});
test("encrypted verification grants are scoped to one request and cannot authenticate to the CMS", async () => {
  const identity = {
    grantId: randomUUID(),
    userId: "owner",
    oidc: providerSession,
  };
  const expires = Math.floor(Date.now() / 1000) + 300;
  const token = await sealTestIdentity("verification", identity, expires);
  assert(!token.includes(providerSession.sid));
  assert.deepEqual(await openTestIdentity("verification", token), identity);
  assert.equal(await verifySessionToken(token), null);
  await assert.rejects(openTestIdentity("approval-identity", token));
  await assert.rejects(
    openTestIdentity("verification", token.slice(0, -10) + "tampered"),
  );
  await assert.rejects(
    sealTestIdentity(
      "verification",
      identity,
      Math.floor(Date.now() / 1000) - 1,
    ),
  );
  await assert.rejects(
    sealTestIdentity(
      "verification",
      identity,
      Math.floor(Date.now() / 1000) + 601,
    ),
  );
  await assert.rejects(
    sealTestIdentity(
      "verification",
      { ...identity, oidc: { ...providerSession, expiresAt: expires - 1 } },
      expires,
    ),
  );
  await assert.rejects(
    sealTestIdentity(
      "verification",
      { ...identity, grantId: "https://evil.example" },
      expires,
    ),
  );
});
test("owner approval receipts bind fresh OIDC authentication to the exact request, identity and owner session", async () => {
  const id = randomUUID(),
    token = "owner-SSO-session";
  const receipt = await sealOwnerReceipt(id, "owner", token);
  assert(await verifyOwnerReceipt(receipt, id, "owner", token));
  assert(!(await verifyOwnerReceipt(receipt, randomUUID(), "owner", token)));
  assert(!(await verifyOwnerReceipt(receipt, id, "other-owner", token)));
  assert(
    !(await verifyOwnerReceipt(receipt, id, "owner", "different-session")),
  );
  assert(
    !(await verifyOwnerReceipt(
      receipt.slice(0, -10) + "tampered",
      id,
      "owner",
      token,
    )),
  );
  assert(!receipt.includes(token));
});
test("approval OAuth transactions have an encrypted local-only destination and demand recent owner authentication", async () => {
  const provider = new oidc.Configuration(
    {
      issuer: "https://auth.edge.phao.dev",
      authorization_endpoint: "https://auth.edge.phao.dev/auth",
      token_endpoint: "https://auth.edge.phao.dev/token",
      jwks_uri: "https://auth.edge.phao.dev/jwks",
    },
    config.clientId,
    {},
    oidc.ClientSecretBasic(config.clientSecret),
  );
  const id = randomUUID(),
    flow = await beginAdminLogin(config, provider, id),
    tx = await openLoginTransaction(flow.cookie, config);
  assert.equal(tx.approvalId, id);
  assert.equal(flow.authorizationUrl.searchParams.get("prompt"), "login");
  assert.equal(flow.authorizationUrl.searchParams.get("max_age"), "300");
  assert.equal(
    flow.authorizationUrl.searchParams.get("code_challenge_method"),
    "S256",
  );
  for (const destination of [
    "https://evil.example",
    "//evil.example",
    "../admin",
    "not-a-uuid",
  ]) {
    assert(!isGrantId(destination));
    await assert.rejects(beginAdminLogin(config, provider, destination));
    await assert.rejects(
      openLoginTransaction(
        await sealLoginTransaction({ ...tx, approvalId: destination }),
        config,
      ),
    );
  }
  const otherToken = await new EncryptJWT({})
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(new Uint8Array(32));
  await assert.rejects(openTestIdentity("verification", otherToken));
});
test("approval code exchange accepts fresh signed authentication and rejects missing or stale auth_time", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256"),
    jwk = {
      ...(await exportJWK(publicKey)),
      kid: "approval-test",
      alg: "RS256",
      use: "sig",
    };
  for (const authTime of [
    Math.floor(Date.now() / 1000),
    undefined,
    Math.floor(Date.now() / 1000) - 3600,
  ]) {
    const provider = new oidc.Configuration(
      {
        issuer: "https://auth.edge.phao.dev",
        authorization_endpoint: "https://auth.edge.phao.dev/auth",
        token_endpoint: "https://auth.edge.phao.dev/token",
        jwks_uri: "https://auth.edge.phao.dev/jwks",
      },
      config.clientId,
      { id_token_signed_response_alg: "RS256" },
      oidc.ClientSecretBasic(config.clientSecret),
    );
    oidc.enableNonRepudiationChecks(provider);
    const id = randomUUID(),
      flow = await beginAdminLogin(config, provider, id),
      tx = await openLoginTransaction(flow.cookie, config);
    provider[oidc.customFetch] = async (url) => {
      if (String(url).endsWith("/jwks")) return Response.json({ keys: [jwk] });
      const idToken = await new SignJWT({
        nonce: tx.nonce,
        sid: providerSession.sid,
        provider_session_expires_at: providerSession.expiresAt,
        ...(authTime === undefined ? {} : { auth_time: authTime }),
      })
        .setProtectedHeader({ alg: "RS256", kid: "approval-test" })
        .setIssuer("https://auth.edge.phao.dev")
        .setAudience(config.clientId)
        .setSubject(providerSession.subject)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey);
      return Response.json({
        access_token: "disposable-test-token",
        token_type: "Bearer",
        id_token: idToken,
        expires_in: 300,
      });
    };
    const callback = new URL(config.callbackUri);
    callback.search = new URLSearchParams({
      code: "test-code",
      state: tx.state,
    }).toString();
    const result = completeAdminLogin(callback, flow.cookie, config, provider);
    if (
      authTime === undefined ||
      authTime < Math.floor(Date.now() / 1000) - 300
    )
      await assert.rejects(result);
    else assert.equal((await result).approvalId, id);
  }
});
