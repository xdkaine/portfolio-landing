import { NextResponse } from "next/server";
export function v2Json(data: unknown, status = 200) {
  return NextResponse.json({ version: "v2", data }, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
export async function publicV2Response(response: Response) {
  const payload = await response.json();
  return v2Json(Array.isArray(payload) ? { items: payload, total: payload.length } : payload, response.status);
}
