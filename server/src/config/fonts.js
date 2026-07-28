import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

/**
 * Guarantees text overlays render the same on every host.
 *
 * sharp draws SVG text through librsvg, which finds fonts via fontconfig. On a
 * developer's machine that quietly uses Arial; on Railway's slim Linux image
 * there may be NO usable font, so the warranty badge text would render blank —
 * a silent, production-only failure. To remove that risk we ship Roboto in the
 * repo and, at boot, generate a fonts.conf with absolute paths and point
 * fontconfig at it BEFORE sharp is first used.
 *
 * Import this for its side effect from the entry point, ahead of any rendering.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(here, '../../assets');
const FONTS_DIR = path.join(ASSETS, 'fonts');
const TEMPLATE = path.join(ASSETS, 'fontconfig', 'fonts.conf');

/** The family name our overlay SVGs reference. */
export const FONT_FAMILY = 'Roboto';

let ready = false;

export function ensureFonts() {
  if (ready) return;
  try {
    const cacheDir = path.join(os.tmpdir(), 'autovision-fontcache');
    fs.mkdirSync(cacheDir, { recursive: true });

    const conf = fs
      .readFileSync(TEMPLATE, 'utf8')
      .replace('__FONTS_DIR__', FONTS_DIR)
      .replace('__CACHE_DIR__', cacheDir);

    const confPath = path.join(cacheDir, 'fonts.conf');
    fs.writeFileSync(confPath, conf);

    // librsvg/fontconfig read these env vars on first use.
    process.env.FONTCONFIG_FILE = confPath;
    process.env.FONTCONFIG_PATH = path.dirname(confPath);
    ready = true;
  } catch (err) {
    // Non-fatal: on a host that already has fonts, sharp still renders with the
    // system default. We only lose the guarantee, not the feature.
    // eslint-disable-next-line no-console
    console.warn('[fonts] could not configure bundled fonts:', err?.message);
  }
}

// Configure immediately on import so it is set before sharp initialises.
ensureFonts();

export default ensureFonts;
