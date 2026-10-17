import type { Metadata } from "next";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";
export const metadata: Metadata = {
  title: "Owner-approved test access",
  robots: PRIVATE_ROUTE_ROBOTS,
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
