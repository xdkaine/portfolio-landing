import { v2Error, v2Json } from "@/lib/v2/http";
import { writingErrorResponse } from "@/lib/v2/writingHttp";
import { getWriting } from "@/lib/v2/writingServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const article = await getWriting((await params).slug);
    return article ? v2Json(article) : v2Error("Writing not found.", 404);
  } catch (error) {
    return writingErrorResponse(error);
  }
}
