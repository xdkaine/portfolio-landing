import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  robots: PRIVATE_ROUTE_ROBOTS,
};

export default async function LoginPage() {
  const session = await verifySession();

  if (session) {
    redirect("/admin");
  }

  return <LoginForm />;
}
