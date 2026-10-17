import { notFound } from "next/navigation";
import { testAccessEnabled } from "@/lib/testAccess";
import TestAccessRequest from "@/components/TestAccessRequest";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!testAccessEnabled()) notFound();
  return <TestAccessRequest />;
}
