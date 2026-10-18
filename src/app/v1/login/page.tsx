import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";
import LoginForm from "@/components/LoginForm";
import SsoLoginForm from "@/components/SsoLoginForm";
import { approvedAdminSessionsEnabled } from "@/lib/approvedAdminSession";
import { isAdminSsoEnabled } from "@/lib/oidcConfig";

export const metadata: Metadata = {
  title: "Sign In",
  robots: PRIVATE_ROUTE_ROBOTS,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await verifySession();

  if (session) {
    redirect("/v1/admin");
  }

  if (isAdminSsoEnabled()) {
    const { error } = await searchParams;
    return <SsoLoginForm failed={error === "sso_failed"} approvedAdminEnabled={approvedAdminSessionsEnabled()} />;
  }
  return <LoginForm />;
}
