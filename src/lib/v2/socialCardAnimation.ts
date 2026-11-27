import { join } from "node:path";
import sharp from "sharp";
import { ANIMATED_SOCIAL_CARD_SIZE, SOCIAL_CARD_SIZE } from "./socialPreview";

export const CHUCKLES_GIF = join(process.cwd(), "public/media/chuckles-loop.gif");

export type DuckBounds = { left: number; top: number; width: number; height: number };

const scale = ANIMATED_SOCIAL_CARD_SIZE.width / SOCIAL_CARD_SIZE.width;
const frameStep = 2;
const animationMetadata = sharp(CHUCKLES_GIF, { animated: true }).metadata();
const frameSets = new Map<number, ReturnType<typeof loadFrames>>();

function loadFrames({ width, height }: Pick<DuckBounds, "width" | "height">) {
  return sharp(CHUCKLES_GIF, { animated: true })
    .resize({ width, height, fit: "contain", background: "transparent" })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

export async function animateSocialCard(background: Response, duck: DuckBounds) {
  const width = Math.round(duck.width * scale);
  const height = Math.round(duck.height * scale);
  const left = Math.round(duck.left * scale);
  const top = Math.round(duck.top * scale);
  const canvas = { ...ANIMATED_SOCIAL_CARD_SIZE, channels: 3 as const };
  const patch = { width, height, channels: canvas.channels };
  const patchRgba = { width, height, channels: 4 as const };

  let frames = frameSets.get(width);
  if (!frames) {
    frames = loadFrames({ width, height });
    frameSets.set(width, frames);
  }

  const [duckPixels, metadata, basePixels] = await Promise.all([
    frames,
    animationMetadata,
    background.arrayBuffer().then((bytes) =>
      sharp(bytes).resize(canvas.width, canvas.height).removeAlpha().raw().toBuffer()
    ),
  ]);
  const backgroundPatch = await sharp(basePixels, { raw: canvas })
    .extract({ left, top, width, height }).raw().toBuffer();

  const delays = metadata.delay ?? [];
  const frameSize = basePixels.length;
  const duckFrameSize = width * height * patchRgba.channels;
  if (delays.length < 2 || duckPixels.length !== delays.length * duckFrameSize) {
    throw new Error("The footer GIF did not decode into the expected animation frames.");
  }
  const rowSize = width * patch.channels;
  const output = Buffer.allocUnsafe(frameSize * Math.ceil(delays.length / frameStep));
  const outputDelays: number[] = [];

  // The canvas stays fixed. Composite only the rectangle occupied by the duck.
  for (let index = 0; index < delays.length; index += frameStep) {
    const frameOffset = frameSize * outputDelays.length;
    const input = duckPixels.subarray(index * duckFrameSize, (index + 1) * duckFrameSize);
    const overlay = await sharp(backgroundPatch, { raw: patch })
      .composite([{ input, raw: patchRgba }]).removeAlpha().raw().toBuffer();
    basePixels.copy(output, frameOffset);

    for (let row = 0; row < height; row++) {
      const destination = frameOffset + ((top + row) * canvas.width + left) * canvas.channels;
      overlay.copy(output, destination, row * rowSize, (row + 1) * rowSize);
    }
    outputDelays.push(delays[index] + (delays[index + 1] ?? 0));
  }

  const { data } = await sharp(output, {
    raw: { ...canvas, height: canvas.height * outputDelays.length, pageHeight: canvas.height },
  })
    .gif({ loop: metadata.loop ?? 0, delay: outputDelays, effort: 1, dither: 0, reuse: false })
    .toUint8Array();
  return new Uint8Array(data);
}
