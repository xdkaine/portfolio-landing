import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  const session = await verifySession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminDashboardClient />;
}
