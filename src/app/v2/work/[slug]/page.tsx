import { redirect } from "next/navigation";
import { legacyProjectNumber } from "@/lib/v2/legacyProjects";
export default async function LegacyProject({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(legacyProjectNumber(slug) ? `/v2/projects/${legacyProjectNumber(slug)}` : "/v2/projects");
}
