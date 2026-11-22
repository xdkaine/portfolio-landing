import { GET as post } from "@/app/v1/api/posts/[id]/route";
import { publicV2Response } from "@/lib/v2/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return publicV2Response(await post(request, { params: Promise.resolve({ id: slug }) }));
}
