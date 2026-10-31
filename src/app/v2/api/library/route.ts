import { v2Json } from "@/lib/v2/http";
import { parseLibraryQuery } from "@/lib/v2/library";
import { loadLibrary } from "@/lib/v2/libraryServer";
import { writingErrorResponse } from "@/lib/v2/writingHttp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const query = parseLibraryQuery(new URL(request.url).searchParams);
    return v2Json(await loadLibrary(query));
  } catch (error) {
    return writingErrorResponse(error);
  }
}
