import { listProjects } from "@/lib/projectCatalog";
import { v2Json } from "@/lib/v2/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const items = await listProjects(); return v2Json({ items, total: items.length }); }
  catch { return v2Json({ error: "Project content could not be loaded." }, 503); }
}
