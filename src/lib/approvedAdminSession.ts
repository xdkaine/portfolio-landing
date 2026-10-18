import { isAdminSsoEnabled } from "@/lib/oidcConfig";
import type { AdminProviderSession } from "@/lib/oidcSession";
import { openTestIdentity, TEST_ACCESS_SCOPE, TEST_ACCESS_SECONDS } from "@/lib/testAccessPolicy";

export function approvedAdminSessionsEnabled() {
  return process.env.ENABLE_APPROVED_ADMIN_SESSIONS === "true" && isAdminSsoEnabled();
}

export interface ApprovedAdminGrant {
  id: string;
  scope: string;
  state: string;
  approvedById: string | null;
  approvedAt: Date | null;
  sessionExpiresAt: Date | null;
  consumedAt: Date | null;
}
interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}
interface Dependencies {
  enabled: boolean;
  loadGrant: (id: string) => Promise<ApprovedAdminGrant | null>;
  loadUser: (id: string) => Promise<AdminUser | null>;
  mappedUserId: (subject: string) => string | null;
  providerSessionLive: (session: AdminProviderSession) => Promise<boolean>;
}

// Used by the real CMS authorization path on every request, never as a cached
// provider assertion or a replacement for the owner's normal eight-hour login.
export async function resolveApprovedAdminSession(token: string | undefined, deps: Dependencies) {
  if (!deps.enabled || !token) return null;
  try {
    const identity = await openTestIdentity("admin-session", token);
    const [grant, user] = await Promise.all([
      deps.loadGrant(identity.grantId), deps.loadUser(identity.userId),
    ]);
    const now = Date.now();
    if (!grant || grant.id !== identity.grantId || grant.scope !== TEST_ACCESS_SCOPE
      || grant.state !== "APPROVED" || !grant.consumedAt || !grant.approvedAt
      || grant.approvedById !== identity.userId || !grant.sessionExpiresAt
      || grant.sessionExpiresAt.getTime() <= now
      || grant.sessionExpiresAt.getTime() > grant.approvedAt.getTime() + TEST_ACCESS_SECONDS * 1000
      || grant.sessionExpiresAt.getTime() > identity.oidc.expiresAt * 1000
      || !user || user.id !== identity.userId || user.role !== "ADMIN"
      || deps.mappedUserId(identity.oidc.subject) !== identity.userId
      || !await deps.providerSessionLive(identity.oidc)) return null;
    return {
      userId: user.id, email: user.email, name: user.name, role: "ADMIN" as const,
      approvedTestSession: { grantId: grant.id, expiresAt: grant.sessionExpiresAt.toISOString() },
    };
  } catch { return null; }
}
