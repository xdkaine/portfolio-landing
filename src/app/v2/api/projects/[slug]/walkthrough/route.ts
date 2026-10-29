import { UMA_WALKTHROUGH } from "@/lib/v2/walkthrough";
import { v2Error, v2Json } from "@/lib/v2/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return (await params).slug === "uma"
    ? v2Json(UMA_WALKTHROUGH)
    : v2Error("No interactive walkthrough is available for this project.", 404);
}
