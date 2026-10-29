import { getHome } from "@/lib/v2/catalog";
import { v2Json } from "@/lib/v2/http";
export function GET() {
  return v2Json(getHome());
}
