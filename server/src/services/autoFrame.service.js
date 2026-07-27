import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * Guarantees the vehicle fills the frame to a target size — deterministically,
 * after the model has run.
 *
 * WHY THIS EXISTS: the client rejected the output four times for the car being
 * too small ("even hero mode not the correct proportion", "definitely too small
 * for hero shot"). The framing is described to gpt-image-1 in words, and the
 * model simply does not honour it reliably — one render fills 50%, the next 70%.
 * You cannot prompt your way to an exact proportion.
 *
 * So instead of trusting the model, we MEASURE where the car ended up in the
 * generated image and crop-zoom so it fills a fixed fraction of the width. This
 * changes no pixels of the car — it is a crop and a resize, the same operation a
 * photographer does — but the size is now identical every single time.
 *
 * ROBUSTNESS: the detector can be wrong on a busy background, and a wrong crop is
 * a worse glitch than a small car. So every implausible measurement falls back
 * to the plain resize (the model's own framing). It never makes things worse
 * than before; it only improves the confident cases — which are the vast
 * majority, because the app renders onto clean studio and showroom plates.
 */

/** Work resolution for detection — small is fine and fast. */
const DS = 300;
/** Trim this fraction of edge energy off each side to find the car's span. */
const TRIM = 0.035;
/** Below this width or height fraction, the detection is not a whole car. */
const MIN_BOX = 0.18;
/** Above this, the car already fills the frame — nothing to gain, and risky. */
const MAX_BOX = 0.97;

/**
 * Find the vehicle's bounding box in a generated image from edge-energy profiles.
 * The car is the concentrated high-contrast mass; studio/showroom backgrounds are
 * comparatively smooth, so trimming the low-energy margins isolates the car.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<{x:number,y:number,w:number,h:number,ok:boolean,reason:string}>}
 *          box in 0..1 fractions; ok=false means "don't auto-frame this one".
 */
export async function measureCarBox(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(DS, DS, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const at = (x, y) => data[y * w + x];

  // Sobel gradient magnitude, accumulated into column and row energy profiles.
  const col = new Float64Array(w);
  const row = new Float64Array(h);
  let total = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const m = Math.abs(gx) + Math.abs(gy);
      col[x] += m;
      row[y] += m;
      total += m;
    }
  }

  if (total <= 0) {
    return { x: 0, y: 0, w: 1, h: 1, ok: false, reason: 'no edges found' };
  }

  // Trim `TRIM` of the total edge energy off each end of each axis. Whatever
  // survives in the middle is the car. Robust to sparse background edges
  // (a showroom floor seam, a window mullion) because those carry little energy.
  const trimSpan = (prof, n) => {
    const cut = total * TRIM;
    let lo = 0;
    let acc = 0;
    while (lo < n - 1 && acc + prof[lo] < cut) acc += prof[lo++];
    let hi = n - 1;
    acc = 0;
    while (hi > lo && acc + prof[hi] < cut) acc += prof[hi--];
    return [lo, hi];
  };

  const [x0, x1] = trimSpan(col, w);
  const [y0, y1] = trimSpan(row, h);

  const box = {
    x: x0 / w,
    y: y0 / h,
    w: (x1 - x0 + 1) / w,
    h: (y1 - y0 + 1) / h,
  };

  // Sanity gates — a measurement outside these is not a trustworthy whole-car box.
  if (box.w < MIN_BOX || box.h < MIN_BOX) {
    return { ...box, ok: false, reason: `box too small (${(box.w * 100) | 0}×${(box.h * 100) | 0}%)` };
  }
  if (box.w > MAX_BOX && box.h > MAX_BOX) {
    return { ...box, ok: false, reason: 'car already fills the frame' };
  }
  return { ...box, ok: true, reason: 'ok' };
}

/**
 * Crop-zoom a generated image so the car fills `fillWidth` of the output width,
 * then resize to exactly outW×outH.
 *
 * @param {Buffer} imageBuffer   the model's output (native gen size)
 * @param {object} opts
 * @param {number} opts.fillWidth   target car-width as a fraction of the frame (e.g. 0.9)
 * @param {number} opts.outW
 * @param {number} opts.outH
 * @param {number} [opts.groundBias]  0..1 where the car's vertical centre should sit
 *                                    (0.5 = middle; lower puts more ground below)
 * @returns {Promise<{buffer:Buffer, applied:boolean, fill:number, reason:string}>}
 */
export async function autoFrameToFill(imageBuffer, { fillWidth, outW, outH, groundBias = 0.52 }) {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width;
  const H = meta.height;

  const box = await measureCarBox(imageBuffer);

  // Not confident → deliver the plain resize. Never worse than before.
  if (!box.ok) {
    const buffer = await sharp(imageBuffer)
      .resize({ width: outW, height: outH, fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    logger.info(`Auto-frame skipped (${box.reason}) — delivered plain ${outW}x${outH}.`);
    return { buffer, applied: false, fill: box.w, reason: box.reason };
  }

  // Car box in source pixels.
  const bx = box.x * W;
  const by = box.y * H;
  const bw = box.w * W;
  const bh = box.h * H;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  const outAspect = outW / outH;

  // The crop window whose WIDTH makes the car fill `fillWidth` of it.
  let cropW = bw / fillWidth;
  let cropH = cropW / outAspect;

  // If the car is tall (front-on SUV) and would overflow the crop height, grow
  // the crop from height instead so the whole car always fits with a little air.
  const maxCarHeightInCrop = 0.9;
  if (bh / cropH > maxCarHeightInCrop) {
    cropH = bh / maxCarHeightInCrop;
    cropW = cropH * outAspect;
  }

  // Clamp the crop to the image. If the target crop is bigger than the source
  // (car is small and we'd need to invent pixels), cap at the source and accept
  // a slightly smaller fill rather than upscaling past 1:1.
  cropW = Math.min(cropW, W);
  cropH = Math.min(cropH, H);

  let left = Math.round(cx - cropW / 2);
  let top = Math.round(cy - cropH / 2 - (0.5 - groundBias) * cropH);
  left = Math.max(0, Math.min(left, W - Math.round(cropW)));
  top = Math.max(0, Math.min(top, H - Math.round(cropH)));

  const cw = Math.min(Math.round(cropW), W - left);
  const ch = Math.min(Math.round(cropH), H - top);

  const buffer = await sharp(imageBuffer)
    .extract({ left, top, width: cw, height: ch })
    .resize({ width: outW, height: outH, fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const achievedFill = bw / cw;
  logger.info(
    `Auto-framed — car ${(box.w * 100) | 0}% of source → ${(achievedFill * 100) | 0}% of output ` +
      `(target ${(fillWidth * 100) | 0}%).`
  );
  return { buffer, applied: true, fill: achievedFill, reason: 'framed' };
}

export default { measureCarBox, autoFrameToFill };
