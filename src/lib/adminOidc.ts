import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import * as oidc from "openid-client";
import { assertJwtSecretConfiguration } from "../../runtime-config.mjs";
import { ADMIN_OIDC_ISSUER, mappedAdminId, type AdminOidcConfig } from "@/lib/oidcConfig";
import { validProviderSession, type AdminProviderSession } from "@/lib/oidcSession";

export const OIDC_TRANSACTION_COOKIE = "portfolio-oidc-transaction";
export const OIDC_TRANSACTION_SECONDS = 600;
const TRANSACTION_AUDIENCE = "portfolio-admin-oidc-transaction";

export interface LoginTransaction {
  origin: string;
  state: string;
  nonce: string;
  verifier: string;
}

function transactionKey() {
  assertJwtSecretConfiguration();
  return createHash("sha256").update(`portfolio-oidc-transaction:v1\0${process.env.JWT_SECRET}`).digest();
}

export async function sealLoginTransaction(transaction: LoginTransaction, expiresAt = Math.floor(Date.now() / 1000) + OIDC_TRANSACTION_SECONDS) {
  return new EncryptJWT({ ...transaction })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuer("portfolio-landing")
    .setAudience(TRANSACTION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .encrypt(transactionKey());
}

export async function openLoginTransaction(token: string, config: AdminOidcConfig): Promise<LoginTransaction> {
  if (token.length > 4096) throw new Error("Invalid login transaction");
  const { payload } = await jwtDecrypt(token, transactionKey(), {
    issuer: "portfolio-landing", audience: TRANSACTION_AUDIENCE,
    keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"],
  });
  if (payload.origin !== config.origin || ![payload.state, payload.nonce, payload.verifier].every(value =>
    typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value))) {
    throw new Error("Invalid login transaction");
  }
  return { origin: config.origin, state: payload.state as string, nonce: payload.nonce as string,
    verifier: payload.verifier as string };
}

export async function adminProviderConfiguration(config: AdminOidcConfig): Promise<oidc.Configuration> {
  const provider = await oidc.discovery(new URL(ADMIN_OIDC_ISSUER), config.clientId,
    { id_token_signed_response_alg: "RS256" }, oidc.ClientSecretBasic(config.clientSecret), {
      timeout: 8,
      [oidc.customFetch]: (url, options) => {
        if (new URL(String(url)).origin !== ADMIN_OIDC_ISSUER) throw new Error("Unexpected identity endpoint");
        const body = options.body instanceof Uint8Array ? new Uint8Array(options.body).buffer : options.body;
        return fetch(url, { ...options, body, redirect: "error", cache: "no-store" });
      },
    });
  const metadata = provider.serverMetadata();
  for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri]) {
    if (!endpoint || new URL(endpoint).origin !== ADMIN_OIDC_ISSUER) throw new Error("Unexpected identity endpoint");
  }
  oidc.enableNonRepudiationChecks(provider);
  return provider;
}

export async function beginAdminLogin(config: AdminOidcConfig, provider?: oidc.Configuration) {
  const transaction: LoginTransaction = { origin: config.origin, state: oidc.randomState(),
    nonce: oidc.randomNonce(), verifier: oidc.randomPKCECodeVerifier() };
  const authorizationUrl = oidc.buildAuthorizationUrl(provider ?? await adminProviderConfiguration(config), {
    redirect_uri: config.callbackUri,
    scope: "openid profile amr",
    response_type: "code",
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(transaction.verifier),
    code_challenge_method: "S256",
  });
  return { authorizationUrl, cookie: await sealLoginTransaction(transaction) };
}

export function adminIdentityFromClaims(claims: Record<string, unknown>, config: AdminOidcConfig) {
  const session = { subject: claims.sub, sid: claims.sid,
    expiresAt: claims.provider_session_expires_at };
  if (!validProviderSession(session)) throw new Error("Missing provider session");
  const userId = mappedAdminId(config, session.subject);
  if (!userId) throw new Error("Admin identity is not authorized");
  return { userId, providerSession: session as AdminProviderSession };
}

export async function completeAdminLogin(
  requestUrl: URL, token: string, config: AdminOidcConfig, provider?: oidc.Configuration,
) {
  const transaction = await openLoginTransaction(token, config);
  for (const name of ["code", "state", "iss", "error"]) {
    if (requestUrl.searchParams.getAll(name).length > 1) throw new Error("Duplicate callback parameter");
  }
  if (requestUrl.searchParams.get("state") !== transaction.state || !requestUrl.searchParams.get("code")
    || requestUrl.searchParams.get("code")!.length > 4096 || requestUrl.searchParams.has("error")) {
    throw new Error("Invalid authorization response");
  }
  // Never use the request Host or forwarded headers to select a redirect URI.
  const callback = new URL(config.callbackUri);
  callback.search = requestUrl.search;
  const tokens = await oidc.authorizationCodeGrant(provider ?? await adminProviderConfiguration(config), callback, {
    expectedState: transaction.state, expectedNonce: transaction.nonce,
    pkceCodeVerifier: transaction.verifier, idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims) throw new Error("Missing identity token");
  return adminIdentityFromClaims(claims, config);
}
