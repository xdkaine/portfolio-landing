import { notFound, redirect } from "next/navigation";
import { testAccessEnabled } from "@/lib/testAccess";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!testAccessEnabled()) notFound();
  redirect("/v1/admin");
}
