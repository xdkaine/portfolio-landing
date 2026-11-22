import { v2Json } from "@/lib/v2/http";
import { listProjects } from "@/lib/projectCatalog";
import { countPublishedPosts, listPublishedPosts } from "@/lib/postEditorial";
import { buildHomeStats } from "@/lib/homeStats";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [projects, postCount, posts] = await Promise.all([listProjects(), countPublishedPosts(), listPublishedPosts({ limit: 4 })]);
    return v2Json({ stats: buildHomeStats(projects, postCount), projects, posts });
  } catch { return v2Json({ error: "Portfolio content could not be loaded." }, 503); }
}
