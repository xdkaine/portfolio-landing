import { ImageResponse } from "next/og";
import { getPublishedPostBySlug } from "@/lib/postEditorial";

export const runtime = "nodejs";
export const alt = "Transmission article share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  const title = post?.title ?? "TRANSMISSIONS";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://phao.dev";
  const coverUrl = post?.coverImage?.startsWith("/") ? `${siteUrl}${post.coverImage}` : post?.coverImage;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0A0A", color: "#E8E8E8", position: "relative", padding: "62px", fontFamily: "monospace" }}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover", opacity: 0.2 }} />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", width: "100%" }}>
        <div style={{ color: "#FF0066", fontSize: 18, letterSpacing: "0.32em" }}>TRANSMISSIONS //</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: title.length > 48 ? 60 : 78, lineHeight: 0.96, maxWidth: "1040px" }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#999999", fontSize: 17, letterSpacing: "0.18em" }}>
          <span>PHAO.DEV</span>
          <span>{post?.date ?? "EDITORIAL LOG"}</span>
        </div>
      </div>
    </div>,
    size,
  );
}
