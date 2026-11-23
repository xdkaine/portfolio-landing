import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readPostImage } from "@/lib/postImageStorage";
import { readProjectImage } from "@/lib/projectImageStorage";
import { normalizeV1PublicUrl } from "@/lib/v1Path";
import { compactPreviewText, SOCIAL_CARD_SIZE, SOCIAL_SITE_NAME, type SocialPreview } from "./socialPreview";

const imageSize = { width: 412, height: 362 };
const colors = { background: "#000000", surface: "#141414", text: "#E8E8E8", muted: "#A3A3A3", accent: "#FF0066", border: "#303030" };

const fonts = Promise.all([
  readFile(join(process.cwd(), "public/fonts/anton/social-latin.ttf")),
  readFile(join(process.cwd(), "public/fonts/dmmono/social-latin.ttf")),
]);

async function readCover(source: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${SOCIAL_SITE_NAME}`;
  const url = new URL(source, origin);
  if (url.origin !== new URL(origin).origin && url.origin !== `https://${SOCIAL_SITE_NAME}`) return null;
  const path = normalizeV1PublicUrl(url.pathname);

  const upload = path.match(/^\/v1\/uploads\/(posts|projects)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/);
  if (upload) {
    const [, kind, filename] = upload;
    const image = await (kind === "posts" ? readPostImage(filename) : readProjectImage(filename));
    return image?.bytes ?? null;
  }

  const asset = path.replace(/^\/v1\/assets\//, "/");
  if (!/^\/(?:projects|v2|media)\/(?:[A-Za-z0-9][A-Za-z0-9_-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|gif|jpe?g|png|webp)$/i.test(asset)) return null;
  return readFile(join(process.cwd(), "public", asset));
}

async function prepareCover(source?: string | null): Promise<string | null> {
  if (!source) return null;
  try {
    // The CMS can link remote covers. Render only public media stored on this site.
    const bytes = await readCover(source);
    if (!bytes || bytes.length > 16 * 1024 * 1024) return null;
    const image = await sharp(bytes, { limitInputPixels: 32_000_000 })
      .autoOrient()
      .resize({ ...imageSize, fit: "contain", background: colors.surface })
      .flatten({ background: colors.surface })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${image.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderSocialCard(preview: SocialPreview): Promise<ImageResponse> {
  const [[anton, dmMono], cover] = await Promise.all([fonts, prepareCover(preview.image)]);
  const title = compactPreviewText(preview.title.toUpperCase(), 96);
  const titleSize = title.length <= 22 ? 100 : title.length <= 54 ? 74 : title.length <= 74 ? 58 : 46;

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative",
      padding: "48px 58px 58px", background: colors.background, color: colors.text, fontFamily: "DM Mono",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.border}`, paddingBottom: 20, fontSize: 23, letterSpacing: 3 }}>
        <span style={{ color: colors.accent }}>{SOCIAL_SITE_NAME.toUpperCase()}</span>
        <span style={{ color: colors.muted }}>{preview.kind.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", flex: 1, gap: 42, alignItems: "center", paddingTop: 14 }}>
        <div style={{ display: "flex", width: 626, flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", width: 56, height: 5, background: colors.accent }} />
          <div style={{ fontFamily: "Anton", fontSize: titleSize, lineHeight: 1.07, letterSpacing: -0.7, overflow: "hidden", lineClamp: 3, wordBreak: "break-word" }}>{title}</div>
          {preview.description && (
            <div style={{ color: colors.muted, fontSize: 27, lineHeight: 1.35, overflow: "hidden", lineClamp: 5, wordBreak: "break-word" }}>{preview.description}</div>
          )}
        </div>
        <div style={{ ...imageSize, display: "flex", position: "relative", background: colors.surface, flexShrink: 0 }}>
          {cover ? (
            // ImageResponse needs the decoded image data, so this is an ordinary image element.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" {...imageSize} />
          ) : (
            <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontFamily: "Anton", fontSize: 190, letterSpacing: -6, color: "#4A1730" }}>TP</div>
          )}
          <div style={{ position: "absolute", top: 0, left: 0, ...imageSize, display: "flex", border: `1px solid ${colors.border}`, borderBottom: `4px solid ${colors.accent}` }} />
        </div>
      </div>
    </div>,
    {
      ...SOCIAL_CARD_SIZE,
      fonts: [
        { name: "Anton", data: anton, weight: 400, style: "normal" },
        { name: "DM Mono", data: dmMono, weight: 400, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    },
  );
}
