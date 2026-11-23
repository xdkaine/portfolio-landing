import { getProjectByIdOrNumber } from "@/lib/projectCatalog";
import { renderSocialCard } from "@/lib/v2/socialCard";
import { projectSocialPreview } from "@/lib/v2/socialPreview";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectByIdOrNumber(id);
  if (!project) return new Response(null, { status: 404 });
  return renderSocialCard(projectSocialPreview(project));
}
