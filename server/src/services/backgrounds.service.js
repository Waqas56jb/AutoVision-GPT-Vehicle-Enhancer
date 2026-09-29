import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the backgrounds folder (server/backgrounds). */
export const BACKGROUNDS_DIR = path.resolve(__dirname, '../../backgrounds');

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/**
 * Backgrounds shipped with the app. They can never be deleted through the API —
 * the endpoint is public, and one stray request would otherwise wipe a preset
 * for every user until the next deploy.
 */
export const BUILT_IN_BACKGROUNDS = new Set([
  'dealer-showroom.jpg',
  'warm-showroom.png',
  'studio-light-grey.png',
  'studio-charcoal.png',
  'outdoor-blue-sky.png',
]);

/** Ensure the backgrounds folder exists. */
function ensureDir() {
  if (!fs.existsSync(BACKGROUNDS_DIR)) fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
}

/** "warm-showroom.png" → "Warm Showroom" */
function prettyName(file) {
  return file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * List available preset backgrounds. Any image dropped into BACKGROUNDS_DIR
 * shows up automatically — no code change required.
 * @returns {{id:string,name:string,url:string}[]}
 */
export function listBackgrounds() {
  if (!fs.existsSync(BACKGROUNDS_DIR)) return [];
  return fs
    .readdirSync(BACKGROUNDS_DIR)
    .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => ({
      id: f,
      name: prettyName(f),
      url: `/backgrounds/${encodeURIComponent(f)}`,
      builtIn: BUILT_IN_BACKGROUNDS.has(f),
    }))
    // Built-in scenes first, then uploads.
    .sort((a, b) => Number(b.builtIn) - Number(a.builtIn));
}

/**
 * Safely resolve a preset id to an absolute file path (guards path traversal).
 * @param {string} id
 * @returns {string|null}
 */
export function resolveBackgroundPath(id) {
  if (!id) return null;
  const safe = path.basename(id); // strip any directory components
  if (!ALLOWED_EXT.has(path.extname(safe).toLowerCase())) return null;
  const full = path.join(BACKGROUNDS_DIR, safe);
  return fs.existsSync(full) ? full : null;
}

/**
 * Save an uploaded image into the background library (normalised to JPEG,
 * max 2048px). Returns the new background's metadata.
 * @param {Buffer} buffer
 * @param {string} [originalName]
 * @param {number} [now] - timestamp for a unique filename
 */
export async function saveBackground(buffer, originalName = 'background', now = Date.now()) {
  ensureDir();
  const base =
    (originalName || 'background')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'background';
  const filename = `${base}-${now.toString(36)}.jpg`;
  const full = path.join(BACKGROUNDS_DIR, filename);

  await sharp(buffer)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toFile(full);

  return { id: filename, name: prettyName(filename), url: `/backgrounds/${encodeURIComponent(filename)}` };
}

/**
 * Delete a background by id. Returns true if removed.
 * @param {string} id
 */
export function deleteBackground(id) {
  if (BUILT_IN_BACKGROUNDS.has(path.basename(String(id || '')))) return false;
  const full = resolveBackgroundPath(id);
  if (!full) return false;
  fs.unlinkSync(full);
  return true;
}

export default {
  BACKGROUNDS_DIR,
  listBackgrounds,
  resolveBackgroundPath,
  saveBackground,
  deleteBackground,
};
