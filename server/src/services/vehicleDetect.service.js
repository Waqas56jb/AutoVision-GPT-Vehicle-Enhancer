import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * Finds the vehicle's bounding box in a rendered image with a real object
 * detector (DETR ResNet-50, Apache-2.0, run locally via ONNX — no API cost).
 *
 * WHY: auto-framing used to locate the car from edge energy. That works on a
 * plain studio plate but fails on a busy showroom (down-lights, shelving, plants
 * all look like "car"), which is exactly where the client's own backgrounds sit.
 * Measured on real renders it reported 95% fill for a car that was really 59%,
 * and zoomed a square crop until the car's bumper was cut off. A detector that
 * knows what a car is fixes both.
 *
 * The model (~42 MB) downloads once on first use and is cached on disk. If it
 * cannot load (offline host, unsupported CPU), callers fall back to the old
 * edge-energy measurement — the pipeline never fails because of this step.
 */

const MODEL = process.env.VEHICLE_DETECT_MODEL || 'Xenova/detr-resnet-50';
const VEHICLE_LABELS = new Set(['car', 'truck', 'bus']);
const MIN_SCORE = 0.5;

let detectorPromise = null;

function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const t0 = Date.now();
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(os.tmpdir(), 'autovision-models');
      const det = await pipeline('object-detection', MODEL, { dtype: 'q8' });
      logger.info(`Vehicle detector ready (${MODEL}) in ${Date.now() - t0}ms.`);
      return det;
    })().catch((err) => {
      logger.warn(`Vehicle detector unavailable (${err?.message}) — using edge-based framing.`);
      detectorPromise = null; // allow a retry on a later request
      return null;
    });
  }
  return detectorPromise;
}

/** Start loading in the background so the first real request is not slowed. */
export function warmUpVehicleDetector() {
  loadDetector();
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{x:number,y:number,w:number,h:number,ok:boolean,reason:string,score?:number}|null>}
 *          box in 0..1 fractions, or null when the detector is not available.
 */
export async function detectVehicleBox(imageBuffer) {
  const det = await loadDetector();
  if (!det) return null;
  try {
    const { RawImage } = await import('@huggingface/transformers');
    // Decode with OUR sharp and pass raw RGB pixels. Letting transformers decode
    // (RawImage.fromBlob) loads its own bundled sharp/libvips, which clashes with
    // ours in the same process ("colourspace: parameter space not set").
    const { data, info } = await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
    const found = await det(image, { threshold: MIN_SCORE, percentage: true });

    // The subject is the largest vehicle; other cars (keep-background mode) are smaller.
    const vehicles = found
      .filter((d) => VEHICLE_LABELS.has(d.label))
      .map((d) => {
        const x = Math.max(0, d.box.xmin);
        const y = Math.max(0, d.box.ymin);
        const w = Math.min(1, d.box.xmax) - x;
        const h = Math.min(1, d.box.ymax) - y;
        return { x, y, w, h, score: d.score, label: d.label };
      })
      .sort((a, b) => b.w * b.h - a.w * a.h);

    const best = vehicles[0];
    if (!best) return { x: 0, y: 0, w: 1, h: 1, ok: false, reason: 'no vehicle detected' };
    return { ...best, ok: true, reason: `detected ${best.label} (${best.score.toFixed(2)})` };
  } catch (err) {
    logger.warn(`Vehicle detection failed (${err?.message}) — using edge-based framing.`);
    return null;
  }
}

export default { detectVehicleBox, warmUpVehicleDetector };
