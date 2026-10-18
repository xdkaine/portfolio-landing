import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import * as oidc from "openid-client";
import { ADMIN_OIDC_ISSUER, adminOidcConfig, isAdminSsoEnabled, mappedAdminId } from "@/lib/oidcConfig";
import { adminIdentityFromClaims, beginAdminLogin, completeAdminLogin, openLoginTransaction, sealLoginTransaction } from "@/lib/adminOidc";
import { isAdminProviderSessionLive, type AdminProviderSession } from "@/lib/oidcSession";
import { signSessionToken, verifySessionToken } from "@/lib/sessionToken";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { POST as passwordLogin } from "../app/v1/api/auth/login/route";
import { GET as startSso } from "../app/v1/api/auth/oidc/start/route";

const environment = {
  ADMIN_AUTH_MODE: "oidc", NEXT_PUBLIC_SITE_URL: "https://portfolio-dev.example.com",
  OIDC_CLIENT_ID: "portfolio-test", OIDC_CLIENT_SECRET: "test-client-secret-with-at-least-32-characters",
  OIDC_ADMIN_BINDINGS: JSON.stringify({ "approved-subject": "existing-admin-id" }),
};
const config = adminOidcConfig(environment);
const session: AdminProviderSession = { subject: "approved-subject", sid: "provider-session-id", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
const keyPair = generateKeyPair("RS256");
const originalSecret = process.env.JWT_SECRET;
test.before(() => { process.env.JWT_SECRET = "test-session-secret-with-at-least-32-characters"; });
test.after(() => { if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret; });

function provider(providerConfig = config) {
  const p = new oidc.Configuration({ issuer: ADMIN_OIDC_ISSUER,
    authorization_endpoint: `${ADMIN_OIDC_ISSUER}/auth`, token_endpoint: `${ADMIN_OIDC_ISSUER}/token`,
    jwks_uri: `${ADMIN_OIDC_ISSUER}/jwks`, authorization_response_iss_parameter_supported: true,
  }, providerConfig.clientId, { id_token_signed_response_alg: "RS256" }, oidc.ClientSecretBasic(providerConfig.clientSecret));
  oidc.enableNonRepudiationChecks(p);
  return p;
}

test("SSO configuration requires explicit identity bindings and a canonical HTTPS callback", () => {
  assert.equal(isAdminSsoEnabled({}), false);
  assert.equal(config.callbackUri, "https://portfolio-dev.example.com/v1/api/auth/oidc/callback");
  assert.equal(mappedAdminId(config, "unapproved-subject"), null);
  assert.equal(mappedAdminId(config, "__proto__"), null);
  assert.throws(() => adminOidcConfig({ ...environment, OIDC_ADMIN_BINDINGS: "{}" }));
  assert.throws(() => adminOidcConfig({ ...environment, NEXT_PUBLIC_SITE_URL: "http://example.com" }));
  assert.throws(() => adminOidcConfig({ ...environment, NEXT_PUBLIC_SITE_URL: "https://example.com/path" }));
});

test("alias hosts enter SSO on the canonical host before setting a transaction cookie", async t => {
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  t.after(() => { for (const [key,value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const response = await startSso(new Request("https://www.portfolio-dev.example.com/v1/api/auth/oidc/start", { headers: {host:"www.portfolio-dev.example.com"} }));
  assert.equal(response.status,303);
  assert.equal(response.headers.get("location"),config.origin+"/v1/api/auth/oidc/start");
  assert.equal(response.headers.get("set-cookie"),null);
});

test("authorization requests use PKCE S256 and encrypted, expiring, origin-bound transactions", async () => {
  const p = provider();
  const flow = await beginAdminLogin(config, p);
  const tx = await openLoginTransaction(flow.cookie, config);
  assert.equal(flow.authorizationUrl.origin, ADMIN_OIDC_ISSUER);
  assert.equal(flow.authorizationUrl.searchParams.get("code_challenge_method"), "S256");
  assert.equal(flow.authorizationUrl.searchParams.get("code_challenge"), await oidc.calculatePKCECodeChallenge(tx.verifier));
  assert.equal(flow.authorizationUrl.searchParams.get("redirect_uri"), config.callbackUri);
  assert(!flow.cookie.includes(tx.verifier));
  await assert.rejects(openLoginTransaction(flow.cookie, { ...config, origin: "https://other.example.com" }));
  await assert.rejects(openLoginTransaction(flow.cookie.slice(0, -10) + "tampered", config));
  await assert.rejects(openLoginTransaction(await sealLoginTransaction(tx, Math.floor(Date.now()/1000)-1), config));
});

test("a real code exchange validates state, nonce, issuer, audience, signature and subject", async t => {
  const { privateKey, publicKey } = await keyPair;
  const jwk = { ...await exportJWK(publicKey), kid: "test-key", alg: "RS256", use: "sig" };
  for (const failure of [null, "state", "nonce", "issuer", "audience", "signature", "subject", "duplicate-state", "expiry", "missing-sid"] as const) {
    await t.test(failure ?? "approved identity succeeds", async () => {
      const p = provider();
      const flow = await beginAdminLogin(config, p);
      const tx = await openLoginTransaction(flow.cookie, config);
      let tokenCalls = 0;
      p[oidc.customFetch] = async (url, options) => {
        if (String(url).endsWith("/jwks")) return Response.json({ keys: [jwk] });
        assert.equal(String(url), `${ADMIN_OIDC_ISSUER}/token`);
        tokenCalls++;
        const body = new URLSearchParams(String(options.body));
        assert.equal(body.get("code_verifier"), tx.verifier);
        assert.equal(body.get("redirect_uri"), config.callbackUri);
        const signingKey = failure === "signature" ? (await generateKeyPair("RS256")).privateKey : privateKey;
        const idToken = await new SignJWT({ nonce: failure === "nonce" ? "wrong-nonce" : tx.nonce,
          ...(failure === "missing-sid" ? {} : {sid: session.sid}), provider_session_expires_at: session.expiresAt })
          .setProtectedHeader({ alg: "RS256", kid: "test-key" })
          .setIssuer(failure === "issuer" ? "https://wrong.example.com" : ADMIN_OIDC_ISSUER)
          .setAudience(failure === "audience" ? "wrong-client" : config.clientId)
          .setSubject(failure === "subject" ? "not-approved" : session.subject)
          .setIssuedAt().setExpirationTime(failure === "expiry" ? Math.floor(Date.now()/1000)-60 : "5m").sign(signingKey);
        return Response.json({ access_token: "test-access-token", token_type: "Bearer", id_token: idToken, expires_in: 300 });
      };
      const callback = new URL(config.callbackUri);
      callback.search = new URLSearchParams({ code: "test-one-use-code", state: failure === "state" ? "wrong-state" : tx.state, iss: ADMIN_OIDC_ISSUER }).toString();
      if (failure === "duplicate-state") callback.searchParams.append("state", tx.state);
      const completion = completeAdminLogin(callback, flow.cookie, config, p);
      if (failure) await assert.rejects(completion);
      else assert.deepEqual(await completion, { userId: "existing-admin-id", providerSession: session });
      if (failure === "state" || failure === "duplicate-state") assert.equal(tokenCalls, 0);
    });
  }
});

test("email and token role claims cannot grant admin access; provider sessions are mandatory", () => {
  assert.throws(() => adminIdentityFromClaims({ sub: "not-approved", email: "owner@example.com", role: "ADMIN", sid: session.sid, provider_session_expires_at: session.expiresAt }, config));
  assert.throws(() => adminIdentityFromClaims({ sub: session.subject }, config));
  assert.throws(() => adminIdentityFromClaims({ sub: session.subject, sid: session.sid, provider_session_expires_at: 1 }, config));
});

test("central mode requires signed account/version claims and preserves them in its client-bound session", async () => {
  const centralConfig = adminOidcConfig({ ...environment, OIDC_ACCOUNT_LINK_MODE: "idp", OIDC_ADMIN_BINDINGS: "unused-invalid-legacy-config" });
  const p = provider(centralConfig), flow = await beginAdminLogin(centralConfig, p);
  const tx = await openLoginTransaction(flow.cookie, centralConfig);
  const {privateKey,publicKey} = await keyPair;
  const jwk = {...await exportJWK(publicKey),kid:"central-key",alg:"RS256",use:"sig"};
  p[oidc.customFetch] = async url => {
    if (String(url).endsWith('/jwks')) return Response.json({keys:[jwk]});
    const idToken = await new SignJWT({nonce:tx.nonce,sid:session.sid,provider_session_expires_at:session.expiresAt,
      app_user_id:"existing-admin-id",app_link_version:3,app_policy_version:2})
      .setProtectedHeader({alg:"RS256",kid:"central-key"}).setIssuer(ADMIN_OIDC_ISSUER)
      .setAudience(centralConfig.clientId).setSubject(session.subject).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    return Response.json({access_token:'isolated-access',token_type:'Bearer',id_token:idToken,expires_in:300});
  };
  const callback = new URL(centralConfig.callbackUri);
  callback.search = new URLSearchParams({code:'isolated-code',state:tx.state,iss:ADMIN_OIDC_ISSUER}).toString();
  const identity = await completeAdminLogin(callback,flow.cookie,centralConfig,p);
  const expected = {...session,appUserId:'existing-admin-id',linkVersion:3,policyVersion:2,clientId:centralConfig.clientId};
  assert.deepEqual(identity,{userId:'existing-admin-id',providerSession:expected});
  const token = await signSessionToken(identity.userId,'ADMIN',identity.providerSession);
  assert.deepEqual(await verifySessionToken(token),{userId:'existing-admin-id',role:'ADMIN',oidc:expected});
  const claims = {sub:session.subject,sid:session.sid,provider_session_expires_at:session.expiresAt,
    app_user_id:'existing-admin-id',app_link_version:3,app_policy_version:2};
  for (const invalid of [{app_user_id:undefined},{app_link_version:undefined},{app_policy_version:undefined},
    {app_link_version:'3'},{app_policy_version:0},{app_user_id:'../other'}])
    assert.throws(()=>adminIdentityFromClaims({...claims,...invalid},centralConfig));
  assert.throws(()=>adminIdentityFromClaims({sub:session.subject,sid:session.sid,provider_session_expires_at:session.expiresAt},centralConfig));
  assert.throws(()=>adminOidcConfig({...environment,OIDC_ACCOUNT_LINK_MODE:'other'}));
});

test("central liveness carries mapping versions and denies legacy sessions or another client's session", async () => {
  const centralConfig = adminOidcConfig({...environment,OIDC_ACCOUNT_LINK_MODE:'idp'});
  const centralSession = {...session,appUserId:'existing-admin-id',linkVersion:3,policyVersion:2,clientId:centralConfig.clientId};
  let calls=0;
  const fetcher:typeof fetch=async(_url,init)=>{calls++;assert.deepEqual(JSON.parse(String(init?.body)),{
    sid:session.sid,sub:session.subject,require_mfa:true,app_user_id:'existing-admin-id',app_link_version:3,app_policy_version:2,
  });return Response.json({active:true});};
  assert.equal(await isAdminProviderSessionLive(centralConfig,session,fetcher),false);
  assert.equal(await isAdminProviderSessionLive(centralConfig,{...centralSession,clientId:'another-client'},fetcher),false);
  assert.equal(calls,0);
  assert.equal(await isAdminProviderSessionLive(centralConfig,centralSession,fetcher),true);
  assert.equal(await isAdminProviderSessionLive(centralConfig,centralSession,async()=>Response.json({active:false})),false);
  assert.equal(await isAdminProviderSessionLive(centralConfig,centralSession,async()=>{throw Error('offline');}),false);
});

test("central session validation requires active MFA and fails closed on revoke, outage, or malformed response", async () => {
  const activeFetch: typeof fetch = async (url, init) => {
    assert.equal(url, `${ADMIN_OIDC_ISSUER}/session/status`);
    assert.equal(init?.redirect, "error");
    assert.deepEqual(JSON.parse(String(init?.body)), { sub: session.subject, sid: session.sid, require_mfa: true });
    return Response.json({ active: true });
  };
  assert.equal(await isAdminProviderSessionLive(config, session, activeFetch), true);
  for (const response of [Response.json({active:false}), Response.json({active:"true"}), new Response(null,{status:503}), Response.json({})]) {
    assert.equal(await isAdminProviderSessionLive(config, session, async () => response), false);
  }
  assert.equal(await isAdminProviderSessionLive(config, session, async () => { throw new Error("offline"); }), false);
});

test("signed admin sessions carry the exact provider binding and cannot outlive the provider session", async () => {
  const token = await signSessionToken("existing-admin-id", "ADMIN", session);
  assert.deepEqual(await verifySessionToken(token), { userId:"existing-admin-id", role:"ADMIN", oidc:session });
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  assert.equal(payload.exp, session.expiresAt);
  await assert.rejects(signSessionToken("existing-admin-id", "ADMIN", { ...session, expiresAt:1 }));
});

test("SSO mode rejects password login and old password sessions while public routes stay open", async t => {
  const original = process.env.ADMIN_AUTH_MODE;
  process.env.ADMIN_AUTH_MODE = "oidc";
  t.after(() => { if (original === undefined) delete process.env.ADMIN_AUTH_MODE; else process.env.ADMIN_AUTH_MODE = original; });
  const passwordResponse = await passwordLogin(new Request(config.origin+"/v1/api/auth/login", {method:"POST", body:JSON.stringify({email:"owner@example.com",password:"ignored"})}));
  assert.equal(passwordResponse.status, 403);
  const token = await signSessionToken("existing-admin-id", "ADMIN");
  const protectedResponse = await proxy(new NextRequest(config.origin+"/v1/admin", {headers:{cookie:`xtomm-session=${token}`}}));
  assert.equal(protectedResponse.status, 307);
  assert.equal(protectedResponse.headers.get("location"), config.origin+"/v1/login");
  const publicResponse = await proxy(new NextRequest(config.origin+"/v1"));
  assert.equal(publicResponse.headers.get("x-middleware-next"), "1");
  const staleSsoToken = await signSessionToken("existing-admin-id", "ADMIN", session);
  const loginResponse = await proxy(new NextRequest(config.origin+"/v1/login", {headers:{cookie:`xtomm-session=${staleSsoToken}`}}));
  assert.equal(loginResponse.headers.get("location"), null);
});
