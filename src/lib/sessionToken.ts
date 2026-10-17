import { SignJWT, jwtVerify } from "jose";
import { validProviderSession, type AdminProviderSession } from "@/lib/oidcSession";
import {
  assertJwtSecretConfiguration,
  DEVELOPMENT_SECRET,
} from "../../runtime-config.mjs";

export { assertJwtSecretConfiguration };

export const COOKIE_NAME = "xtomm-session";
export const SESSION_ISSUER = "portfolio-landing";
export const SESSION_AUDIENCE = "portfolio-admin";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type SessionRole = "ADMIN" | "EDITOR";

export interface SessionTokenClaims {
  userId: string;
  role: SessionRole;
  oidc?: AdminProviderSession;
}

function configuredSecret(): string | null {
  const value = process.env.JWT_SECRET?.trim();
  return value || null;
}

function jwtSecret(): Uint8Array {
  const secret = configuredSecret();

  if (process.env.NODE_ENV === "production") {
    assertJwtSecretConfiguration();
  }

  return new TextEncoder().encode(secret || DEVELOPMENT_SECRET);
}

function isSessionRole(value: unknown): value is SessionRole {
  return value === "ADMIN" || value === "EDITOR";
}

export async function signSessionToken(
  userId: string,
  role: SessionRole,
  oidc?: AdminProviderSession,
): Promise<string> {
  if (oidc && !validProviderSession(oidc)) throw new Error("Invalid provider session");
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return new SignJWT({ userId, role, ...(oidc ? { oidc } : {}) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(oidc ? Math.min(expires, oidc.expiresAt) : expires)
    .sign(jwtSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    const userId =
      typeof payload.userId === "string" ? payload.userId : payload.sub;
    if (
      typeof userId !== "string" ||
      payload.sub !== userId ||
      !isSessionRole(payload.role)
      || (payload.oidc !== undefined && !validProviderSession(payload.oidc))
    ) {
      return null;
    }

    return { userId, role: payload.role, ...(payload.oidc ? { oidc: payload.oidc as AdminProviderSession } : {}) };
  } catch {
    return null;
  }
}
