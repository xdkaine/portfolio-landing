import { getProject } from "@/lib/v2/catalog";
import { v2Error, v2Json } from "@/lib/v2/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const project = getProject((await params).slug);
  return project ? v2Json(project) : v2Error("Project not found.", 404);
}
