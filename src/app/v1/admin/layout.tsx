import type { Metadata } from "next";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";

export const metadata: Metadata = {
  title: "Administration",
  robots: PRIVATE_ROUTE_ROBOTS,
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
