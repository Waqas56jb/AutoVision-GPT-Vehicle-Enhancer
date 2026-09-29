/**
 * Turning operator uploads into tag assets.
 *
 * Logos and finished tag graphics are re-encoded to PNG (transparency kept) and
 * capped in size, so a 12 MB phone screenshot does not bloat the library or the
 * exported JSON. SVG logos are rasterised at a crisp size.
 * Fonts are validated, stored as data URLs and registered with the browser.
 */

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_MB = 15;
const FONT_EXT = /\.(ttf|otf|woff2?)$/i;
const MAX_FONT_MB = 5;

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Could not read the file.'));
    r.readAsDataURL(blob);
  });

function loadFresh(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be opened as an image.'));
    img.src = src;
  });
}

/**
 * @param {File} file
 * @param {number} maxDim  longest side of the stored PNG
 * @returns {Promise<string>} PNG data URL
 */
export async function fileToTagImage(file, maxDim = 900) {
  if (!file || !IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use a PNG, JPG, WEBP or SVG image.');
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`That image is over ${MAX_IMAGE_MB} MB.`);
  }

  const url = URL.createObjectURL(file);
  let img;
  try {
    img = await loadFresh(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const isSvg = file.type === 'image/svg+xml';
  const iw = img.naturalWidth || (isSvg ? maxDim : 0);
  const ih = img.naturalHeight || (isSvg ? maxDim : 0);
  if (!iw || !ih) throw new Error('That image has no size.');

  // Downscale big bitmaps; scale SVGs UP to the target so they stay crisp.
  const scale = isSvg ? maxDim / Math.max(iw, ih) : Math.min(1, maxDim / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

/**
 * @param {File} file
 * @returns {Promise<{id:string,label:string,family:string,dataUrl:string,createdAt:number}>}
 */
export async function fileToFontRecord(file) {
  if (!file || !FONT_EXT.test(file.name)) {
    throw new Error('Use a .ttf, .otf, .woff or .woff2 font file.');
  }
  if (file.size > MAX_FONT_MB * 1024 * 1024) {
    throw new Error(`That font is over ${MAX_FONT_MB} MB.`);
  }
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const label = file.name.replace(FONT_EXT, '').replace(/[-_]+/g, ' ').trim() || 'Custom font';
  const record = {
    id,
    label,
    // A private family name so an upload can never shadow a built-in font.
    family: `AV Custom ${id}`,
    dataUrl: await readAsDataUrl(file),
    createdAt: Date.now(),
  };
  await registerFont(record); // fails fast on a corrupt font
  return record;
}

const registered = new Set();

/** Make an uploaded font usable by canvas + CSS. */
export async function registerFont(record) {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  if (registered.has(record.family)) return;
  const buf = await (await fetch(record.dataUrl)).arrayBuffer();
  const face = new FontFace(record.family, buf);
  await face.load().catch(() => {
    throw new Error('That font file could not be read.');
  });
  document.fonts.add(face);
  registered.add(record.family);
}

export { readAsDataUrl };
