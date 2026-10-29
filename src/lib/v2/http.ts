export function v2Json(data: unknown, status = 200) {
  return Response.json(
    { version: "v2", data },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    },
  );
}
export function v2Error(message: string, status: number) {
  return Response.json(
    {
      version: "v2",
      error: { code: status === 404 ? "NOT_FOUND" : "INVALID_QUERY", message },
    },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    },
  );
}
