import { GET as project } from "@/app/v1/api/projects/[id]/route";
import { publicV2Response } from "@/lib/v2/http";
import { legacyProjectNumber } from "@/lib/v2/legacyProjects";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return publicV2Response(await project(request, { params: Promise.resolve({ id: legacyProjectNumber(slug) ?? slug }) }));
}
