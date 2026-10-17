import { ADMIN_OIDC_ISSUER, type AdminOidcConfig } from "@/lib/oidcConfig";

export interface AdminProviderSession {
  subject: string;
  sid: string;
  expiresAt: number;
}

export function validProviderSession(value: unknown): value is AdminProviderSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AdminProviderSession>;
  return typeof session.subject === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(session.subject)
    && typeof session.sid === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(session.sid)
    && typeof session.expiresAt === "number" && Number.isSafeInteger(session.expiresAt)
    && session.expiresAt > Date.now() / 1000;
}

export async function isAdminProviderSessionLive(
  config: AdminOidcConfig,
  session: AdminProviderSession,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!validProviderSession(session)) return false;
  try {
    const response = await fetcher(`${ADMIN_OIDC_ISSUER}/session/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({ sid: session.sid, sub: session.subject, require_mfa: true }),
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return Boolean(body && typeof body === "object" && "active" in body && body.active === true);
  } catch {
    return false;
  }
}
