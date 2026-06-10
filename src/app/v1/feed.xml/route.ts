import { listPublishedPosts } from "@/lib/postEditorial";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [posts, settings] = await Promise.all([listPublishedPosts(), getSiteSettings()]);
  const root = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://phao.dev";
  const items = posts.map((post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${root}/v1/blog/${escapeXml(post.slug)}</link>
      <guid>${root}/v1/blog/${escapeXml(post.slug)}</guid>
      <pubDate>${new Date(post.publishedAt ?? post.updatedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(settings.siteName)} - Transmissions</title>
    <link>${root}/v1/blog</link>
    <description>${escapeXml(settings.siteDescription)}</description>${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
