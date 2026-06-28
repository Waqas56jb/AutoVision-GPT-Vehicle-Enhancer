/**
 * Output format presets shared by the enhance + recolor pipelines.
 *
 *  - genSize: the gpt-image-1 size to GENERATE at (must be a supported size:
 *             1024x1024 | 1536x1024 | 1024x1536).
 *  - out:     exact final dimensions to resize to (null = keep native genSize).
 *
 * Carsales requires EXACTLY 1280x853. We generate at 1536x1024 (the same 3:2
 * aspect ratio) for maximum quality, then downscale to 1280x853.
 */
export const FORMAT_PRESETS = {
  carsales: { genSize: '1536x1024', out: { w: 1280, h: 853 } }, // main platform
  landscape: { genSize: '1536x1024', out: null }, // web, FB/Google ads
  square: { genSize: '1024x1024', out: null }, // Instagram, marketplace
  portrait: { genSize: '1024x1536', out: null }, // stories / vertical
};

export const DEFAULT_FORMAT = 'carsales';

/** Resolve a (possibly untrusted) format key to a valid preset. */
export function resolveFormat(format) {
  const key = FORMAT_PRESETS[format] ? format : DEFAULT_FORMAT;
  return { key, preset: FORMAT_PRESETS[key] };
}

export default { FORMAT_PRESETS, DEFAULT_FORMAT, resolveFormat };
