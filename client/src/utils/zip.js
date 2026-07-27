import JSZip from 'jszip';
import { downloadDataUrl } from './download.js';

/**
 * Bundle finished images into a single ZIP and download it.
 *
 * The client asked for "a folder rather than individual photos" — a ZIP is the
 * web's folder. Each entry is named after the car's stock number, with a numeric
 * suffix only when two cars would otherwise collide (or a colour variant shares a
 * stock number), so nothing silently overwrites anything.
 *
 * @param {{name:string, dataUrl:string}[]} entries  name is the desired filename (no extension)
 * @param {string} [zipName]
 */
export async function downloadZip(entries, zipName = 'autovision-images.zip') {
  const zip = new JSZip();
  const used = new Map();

  for (const { name, dataUrl } of entries) {
    const base = sanitise(name);
    // De-duplicate filenames so two cars with the same stock number both survive.
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const filename = `${base}${n > 1 ? `-${n}` : ''}.png`;

    const b64 = dataUrl.split(',')[1];
    zip.file(filename, b64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Make a string safe as a file name across OSes. */
export function sanitise(name) {
  const cleaned = String(name || '')
    .trim()
    .replace(/\.[a-z0-9]+$/i, '') // drop any extension the source name carried
    .replace(/[^a-z0-9._-]+/gi, '-') // keep it filesystem-safe
    .replace(/^-+|-+$/g, '');
  return cleaned || 'image';
}

export default downloadZip;
