import { GET as about } from "@/app/v1/api/about/route";
import { publicV2Response } from "@/lib/v2/http";
export const dynamic = "force-dynamic";
export async function GET() { return publicV2Response(await about()); }
