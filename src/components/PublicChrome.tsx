"use client";
import { usePathname } from "next/navigation";
export function PublicChrome({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/v1/admin") ? null : children;
}
