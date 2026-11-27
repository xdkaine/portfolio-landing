import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readPostImage } from "@/lib/postImageStorage";
import { readProjectImage } from "@/lib/projectImageStorage";
import { normalizeV1PublicUrl } from "@/lib/v1Path";
import { animateSocialCard, CHUCKLES_GIF, type DuckBounds } from "./socialCardAnimation";
import { compactPreviewText, SOCIAL_CARD_SIZE, SOCIAL_SITE_NAME, socialCardVersion, type SocialPreview } from "./socialPreview";

const imageSize = { width: 364, height: 256 };
const homeDuck = { width: 340, height: 272, left: 777, top: 179 };
const detailDuck = { width: 140, height: 112, left: 999, top: 417 };
const cacheControl = "public, max-age=300, s-maxage=3600";
const colors = {
  background: "#000000",
  terminal: "#0A0A0A",
  toolbar: "#101010",
  surface: "#141414",
  text: "#E8E8E8",
  muted: "#A3A3A3",
  accent: "#FF0066",
  border: "#303030",
  grid: "#2A0A17",
};
const terminalSections: Record<SocialPreview["kind"], string> = {
  Portfolio: "~/portfolio",
  Article: "~/blog",
  Project: "~/projects",
};

const fonts = Promise.all([
  readFile(join(process.cwd(), "public/fonts/anton/social-latin.ttf")),
  readFile(join(process.cwd(), "public/fonts/dmmono/social-latin.ttf")),
]);

function duckStill({ width, height }: DuckBounds) {
  // Use the eyes-closed laugh in the static card.
  return sharp(CHUCKLES_GIF, { page: 36 })
    .resize({ width, height, fit: "contain", background: "transparent" })
    .png()
    .toBuffer()
    .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`);
}

const homeDuckStill = duckStill(homeDuck);
const detailDuckStill = duckStill(detailDuck);
type Gif = Awaited<ReturnType<typeof animateSocialCard>>;

const gifCache = new Map<string, Gif>();
const gifJobs = new Map<string, Promise<Gif>>();
let gifQueue = Promise.resolve();

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

export async function renderSocialCard(preview: SocialPreview, pathname: string, request: Request): Promise<Response> {
  const isHome = preview.kind === "Portfolio";
  const duck = isHome ? homeDuck : detailDuck;
  if (!new URL(request.url).pathname.endsWith("/opengraph-image.gif")) {
    return renderCardImage(preview, pathname, duck, await (isHome ? homeDuckStill : detailDuckStill));
  }

  const key = `${pathname}:${socialCardVersion(preview)}`;
  const headers = { "Content-Type": "image/gif", "Cache-Control": cacheControl };
  const cached = gifCache.get(key);
  if (cached) return new Response(cached, { headers });

  let job = gifJobs.get(key);
  if (!job) {
    // Share duplicate requests and bound the work waiting behind the active encoder.
    if (gifJobs.size >= 4) {
      return new Response(null, { status: 503, headers: { "Retry-After": "2", "Cache-Control": "no-store" } });
    }
    job = gifQueue.then(async () => {
      const gif = await animateSocialCard(await renderCardImage(preview, pathname, duck), duck);
      if (gifCache.size >= 12) gifCache.delete(gifCache.keys().next().value!);
      gifCache.set(key, gif);
      return gif;
    }).finally(() => gifJobs.delete(key));
    gifJobs.set(key, job);
    gifQueue = job.then(() => undefined, () => undefined);
  }
  return new Response(await job, { headers });
}

async function renderCardImage(preview: SocialPreview, pathname: string, duck: DuckBounds, chuckles?: string) {
  const [[anton, dmMono], cover] = await Promise.all([fonts, prepareCover(preview.image)]);
  const title = compactPreviewText(preview.title, 96);
  const titleSize = title.length <= 14 ? 80 : title.length <= 36 ? 62 : title.length <= 60 ? 52 : 42;
  const descriptionSize = preview.description.length > 132 ? 23 : 26;
  const address = compactPreviewText(`${SOCIAL_SITE_NAME}${pathname}`, 86);

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", position: "relative", padding: "28px 32px",
      background: colors.background, color: colors.text, fontFamily: "DM Mono",
    }}>
      <div style={{
        display: "flex", flex: 1, flexDirection: "column", background: colors.terminal,
        border: `1px solid ${colors.border}`, borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", height: 60, flexShrink: 0, alignItems: "center",
          padding: "0 32px", background: colors.toolbar, borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 23 }}>
            <span style={{ color: colors.accent, fontSize: 26 }}>&gt;_</span>
            <span>{SOCIAL_SITE_NAME}</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{
            display: "flex", width: 692, flexShrink: 0, flexDirection: "column", justifyContent: "center",
            gap: 17, padding: "22px 22px 22px 38px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24 }}>
              <span style={{ color: colors.accent }}>{terminalSections[preview.kind]}</span>
              <span style={{ color: colors.muted }}>$</span>
              <div style={{ display: "flex", width: 11, height: 23, background: colors.accent }} />
            </div>
            <div style={{ fontSize: titleSize, lineHeight: 1.08, letterSpacing: -2, overflow: "hidden", lineClamp: 3, wordBreak: "break-word" }}>{title}</div>
            {preview.description && (
              <div style={{ color: colors.muted, fontSize: descriptionSize, lineHeight: 1.28, overflow: "hidden", lineClamp: 5, wordBreak: "break-word" }}>{preview.description}</div>
            )}
          </div>
          <div style={{
            display: "flex", flex: 1, justifyContent: "center",
            alignItems: "flex-start", paddingTop: 24,
            borderLeft: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            backgroundImage: `linear-gradient(to right, ${colors.grid} 1px, transparent 1px), linear-gradient(to bottom, ${colors.grid} 1px, transparent 1px)`,
            backgroundSize: "18px 18px",
          }}>
            {preview.kind !== "Portfolio" && (
              <div style={{ ...imageSize, display: "flex", position: "relative", background: colors.surface }}>
                {cover ? (
                  // ImageResponse needs decoded image data from the local preview media.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" {...imageSize} />
                ) : (
                  <div style={{
                    display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center",
                    fontFamily: "Anton", fontSize: 132, color: colors.accent,
                  }}>TP</div>
                )}
                <div style={{
                  position: "absolute", top: 0, left: 0, ...imageSize, display: "flex",
                  border: `1px solid ${colors.border}`, borderTop: `4px solid ${colors.accent}`,
                }} />
              </div>
            )}
          </div>
        </div>
        <div style={{
          display: "flex", height: 54, flexShrink: 0, alignItems: "center", gap: 12, padding: "0 32px",
          background: colors.toolbar, borderTop: `1px solid ${colors.border}`, fontSize: 19, color: colors.muted,
        }}>
          <span style={{ color: colors.accent }}>/</span>
          <span>{address}</span>
        </div>
      </div>
      {chuckles && (
        // ImageResponse needs the decoded frame from the footer GIF.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chuckles} alt="" width={duck.width} height={duck.height} style={{ position: "absolute", left: duck.left, top: duck.top }} />
      )}
    </div>,
    {
      ...SOCIAL_CARD_SIZE,
      fonts: [
        { name: "Anton", data: anton, weight: 400, style: "normal" },
        { name: "DM Mono", data: dmMono, weight: 400, style: "normal" },
      ],
      headers: { "Cache-Control": cacheControl },
    },
  );
}
