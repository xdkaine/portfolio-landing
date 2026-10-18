import { cookies } from "next/headers";
import { cache } from "react";
import { adminOidcConfig, isAdminSsoEnabled, mappedAdminId } from "@/lib/oidcConfig";
import { isAdminProviderSessionLive, type AdminProviderSession } from "@/lib/oidcSession";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  type SessionRole,
  verifySessionToken,
} from "@/lib/sessionToken";

export { COOKIE_NAME } from "@/lib/sessionToken";

export interface AuthenticatedSession {
  userId: string;
  email: string;
  name: string | null;
  role: SessionRole;
}

export async function createSession(userId: string, role: SessionRole, oidc?: AdminProviderSession) {
  const token = await signSessionToken(userId, role, oidc);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: oidc ? Math.min(SESSION_MAX_AGE_SECONDS, oidc.expiresAt - Math.floor(Date.now() / 1000)) : SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

export const verifySession = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const claims = await verifySessionToken(token);
    if (!claims) return null;

    if (isAdminSsoEnabled()) {
      const config = adminOidcConfig();
      if (!claims.oidc || claims.role !== "ADMIN"
        || (config.linkMode === "idp" ? claims.oidc.appUserId !== claims.userId || claims.oidc.clientId !== config.clientId
          : mappedAdminId(config, claims.oidc.subject) !== claims.userId)
        || !await isAdminProviderSessionLive(config, claims.oidc)) return null;
    } else if (claims.oidc) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user || user.role !== claims.role) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
});

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth() {
  const session = await verifySession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(role: SessionRole) {
  const session = await requireAuth();
  if (session.role !== role) {
    throw new Error("Forbidden");
  }
  return session;
}
