import { ProjectQueryError } from "@/lib/v2/catalog";
import { v2Error } from "@/lib/v2/http";

export function writingErrorResponse(error: unknown): Response {
  if (error instanceof ProjectQueryError) return v2Error(error.message, 400);
  return Response.json(
    { version: "v2", error: { code: "CONTENT_UNAVAILABLE", message: "Writing is temporarily unavailable. Please try again." } },
    { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
