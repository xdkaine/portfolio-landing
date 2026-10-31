import { v2Json } from "@/lib/v2/http";
import { parseWritingQuery } from "@/lib/v2/writing";
import { writingErrorResponse } from "@/lib/v2/writingHttp";
import { listWriting } from "@/lib/v2/writingServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const query = parseWritingQuery(new URL(request.url).searchParams);
    return v2Json(await listWriting(query));
  } catch (error) {
    return writingErrorResponse(error);
  }
}
