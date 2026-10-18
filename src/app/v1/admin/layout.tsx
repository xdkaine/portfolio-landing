import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import ApprovedAdminSessionNotice from "@/components/ApprovedAdminSessionNotice";
import type { Metadata } from "next";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";

export const metadata: Metadata = {
  title: "Administration",
  robots: PRIVATE_ROUTE_ROBOTS,
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") redirect("/v1/login");
  return <>
    {session.approvedTestSession ? <ApprovedAdminSessionNotice expiresAt={session.approvedTestSession.expiresAt} /> : null}
    {children}
  </>;
}
