import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the preset-backgrounds folder (server/backgrounds). */
export const BACKGROUNDS_DIR = path.resolve(__dirname, '../../backgrounds');

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

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
    .map((f) => ({ id: f, name: prettyName(f), url: `/backgrounds/${encodeURIComponent(f)}` }));
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

export default { BACKGROUNDS_DIR, listBackgrounds, resolveBackgroundPath };
