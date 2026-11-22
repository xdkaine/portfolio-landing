import { GET as posts } from "@/app/v1/api/posts/route";
import { publicV2Response } from "@/lib/v2/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return publicV2Response(await posts(request)); }
