import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await verifySession();

  if (session) {
    redirect("/admin");
  }

  return <LoginForm />;
}
