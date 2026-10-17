export const ADMIN_OIDC_ISSUER = "https://auth.edge.phao.dev";

export interface AdminOidcConfig {
  origin: string;
  clientId: string;
  clientSecret: string;
  bindings: Record<string, string>;
  callbackUri: string;
}

export function isAdminSsoEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.ADMIN_AUTH_MODE === "oidc";
}

export function adminOidcConfig(environment: Record<string, string | undefined> = process.env): AdminOidcConfig {
  if (!isAdminSsoEnabled(environment)) throw new Error("Admin SSO is disabled");
  const origin = environment.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) {
    throw new Error("Admin SSO requires a canonical HTTPS origin");
  }
  const clientId = environment.OIDC_CLIENT_ID?.trim() ?? "";
  const clientSecret = environment.OIDC_CLIENT_SECRET?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(clientId) || clientSecret.length < 32) {
    throw new Error("Admin SSO client credentials are not configured");
  }
  const bindings: unknown = JSON.parse(environment.OIDC_ADMIN_BINDINGS ?? "null");
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) {
    throw new Error("Admin SSO identity bindings are not configured");
  }
  const entries = Object.entries(bindings);
  if (entries.length === 0 || entries.length > 32 || entries.some(([sub, id]) =>
    !/^[A-Za-z0-9_-]{1,128}$/.test(sub) || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) {
    throw new Error("Invalid admin SSO identity binding");
  }
  return { origin, clientId, clientSecret, bindings: Object.fromEntries(entries),
    callbackUri: `${origin}/v1/api/auth/oidc/callback` };
}

export function mappedAdminId(config: AdminOidcConfig, subject: string): string | null {
  return Object.hasOwn(config.bindings, subject) ? config.bindings[subject] : null;
}
