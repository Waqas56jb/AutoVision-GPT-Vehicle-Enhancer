import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FONT_FAMILY, ensureFonts } from '../config/fonts.js';
import { topEdgeInRange } from './autoFrame.service.js';
import logger from '../utils/logger.js';

/**
 * Draws the dealer's marketing warranty tag onto a finished image.
 *
 * Two layouts, chosen by the operator:
 *   corner — a compact card in a top corner (the "logo tag" brief). Placed in
 *            whichever top corner is clear of the car, using the same box
 *            measurement the auto-framer uses. If the car occupies both top
 *            corners, it falls back to the banner so nothing is ever drawn over
 *            the vehicle.
 *   banner — a header band and a footer band across the top and bottom, sitting
 *            in the sky and the floor, never touching the car.
 *
 * Everything is deterministic SVG composited with sharp — pixel-identical every
 * run, no model variance. Text uses the bundled font (see config/fonts.js) so it
 * renders the same on any host.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.resolve(here, '../../assets/logos');

/**
 * Rasterise an SVG string to a PNG buffer.
 *
 * Kept deliberately simple — a single .png() render, no raw-pixel extraction.
 * On Windows libvips, interleaving SVG rendering with .raw() extraction corrupts
 * global state and throws "colourspace: parameter space not set". By never
 * mixing the two in this module (and by taking the car box as a parameter rather
 * than re-measuring it here), the overlay stays on the safe side of that bug.
 */
async function raster(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** XML-escape text so a stray & or < never breaks the SVG. */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Rough text width for Roboto, good enough to fit/scale a single line.
 *  Slight over-estimate on purpose so text never clips inside its box. */
const textWidth = (s, size, weight = 400) =>
  String(s).length * size * (weight >= 700 ? 0.66 : 0.57);

/** Shrink a font size until the string fits maxWidth (down to a floor). */
function fitSize(s, size, maxWidth, weight, floor = 12) {
  let f = size;
  while (f > floor && textWidth(s, f, weight) > maxWidth) f -= 1;
  return f;
}

/**
 * An official logo the dealer dropped in assets/logos/<key>.(png|svg), or null.
 * We never ship trademarked artwork ourselves — this only uses files the dealer
 * has provided.
 */
function findLogo(key) {
  if (!key) return null;
  for (const ext of ['png', 'svg', 'jpg', 'jpeg', 'webp']) {
    const p = path.join(LOGO_DIR, `${key}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** A brand "chip": the official logo if present, else a clean wordmark tile. */
async function brandChip(brand, size) {
  const logo = findLogo(brand.key);
  if (logo) {
    try {
      return await sharp(logo)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch {
      /* fall through to the wordmark */
    }
  }
  // Typographic fallback: the maker's initial on an accent tile. This names the
  // car's make without reproducing any logo artwork.
  const initial = esc((brand.name || '?').trim().charAt(0).toUpperCase());
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${brand.accent}"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
          font-family="${FONT_FAMILY}" font-weight="800" font-size="${Math.round(size * 0.62)}"
          fill="${brand.accentText}">${initial}</text>
  </svg>`;
  return raster(svg);
}

/** Build the compact corner card as an SVG string (logo composited separately). */
function cornerCardSvg({ w, h, brand, title, subtitle, footer }) {
  const pad = Math.round(h * 0.15);
  const bandH = Math.round(h * 0.24);
  const chipSize = h - pad * 2 - bandH; // logo tile sits in the white area
  const textX = pad + chipSize + Math.round(w * 0.028);
  const textW = w - textX - pad;
  const r = Math.round(h * 0.12);

  const titleSize = fitSize(title, Math.round(h * 0.19), textW, 800, 12);
  const subSize = fitSize(subtitle, Math.round(h * 0.125), textW, 400, 9);
  const footSize = fitSize(footer, Math.round(bandH * 0.42), w - pad * 2, 700, 9);

  // Everything is clipped to one rounded rectangle, so the accent band shares
  // the card's rounded bottom corners instead of poking out square.
  const titleY = pad + titleSize * 0.9;
  const subY = titleY + subSize * 1.55;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="card"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}"/></clipPath></defs>
    <g clip-path="url(#card)">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
      <text x="${textX}" y="${titleY}" font-family="${FONT_FAMILY}" font-weight="800"
            font-size="${titleSize}" fill="#0b1220">${esc(title)}</text>
      <text x="${textX}" y="${subY}" font-family="${FONT_FAMILY}" font-weight="400"
            font-size="${subSize}" fill="#4b5563">${esc(subtitle)}</text>
      <rect x="0" y="${h - bandH}" width="${w}" height="${bandH}" fill="${brand.accent}"/>
      <text x="${w / 2}" y="${h - bandH / 2 + footSize * 0.34}" text-anchor="middle"
            font-family="${FONT_FAMILY}" font-weight="700" font-size="${footSize}"
            fill="${brand.accentText}" letter-spacing="0.4">${esc(footer)}</text>
    </g>
  </svg>`;
}

/** Header + footer bands as one full-canvas SVG (logos composited separately). */
function bannerSvg({ W, H, brand, title, subtitle, footer }) {
  const headH = Math.round(H * 0.13);
  const footH = Math.round(H * 0.088);
  const chip = headH - Math.round(headH * 0.36);
  const tx = Math.round(W * 0.012) + chip + Math.round(W * 0.02);
  const titleSize = fitSize(title, Math.round(headH * 0.4), W - tx - Math.round(W * 0.03), 800, 16);
  const subSize = fitSize(subtitle, Math.round(headH * 0.22), W - tx - Math.round(W * 0.03), 400, 11);
  const footSize = Math.round(footH * 0.4);

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- header -->
    <rect x="0" y="0" width="${W}" height="${headH}" fill="#0b1220" fill-opacity="0.92"/>
    <rect x="0" y="${headH}" width="${W}" height="3" fill="${brand.accent}"/>
    <text x="${tx}" y="${Math.round(headH * 0.44)}" font-family="${FONT_FAMILY}" font-weight="800"
          font-size="${titleSize}" fill="#ffffff">${esc(title)}</text>
    <text x="${tx}" y="${Math.round(headH * 0.44) + subSize * 1.5}" font-family="${FONT_FAMILY}"
          font-weight="400" font-size="${subSize}" fill="#c7d2e0">${esc(subtitle)}</text>

    <!-- footer -->
    <rect x="0" y="${H - footH}" width="${W}" height="${footH}" fill="${brand.accent}"/>
    <text x="${W / 2}" y="${H - footH / 2}" text-anchor="middle" dominant-baseline="central"
          font-family="${FONT_FAMILY}" font-weight="800" font-size="${footSize}"
          fill="${brand.accentText}" letter-spacing="1.2">${esc(footer.toUpperCase())}</text>
  </svg>`;
}

/**
 * Decide which top corner is clear enough for the card, or fall back to banner.
 *
 * Uses the car's actual silhouette top (topEdge profile), not its bounding box:
 * a 3/4 car spans the frame width, but the far corners above its low hood or
 * boot are clear sky. The card fits a corner when the car's highest point in
 * that corner's x-range sits BELOW where the card ends (with a small gap). If
 * neither corner is clear we fall back to the banner, so the card is never drawn
 * across the vehicle — the client's hard rule.
 *
 * @returns {'left'|'right'|'banner'}
 */
function chooseCorner(carBox, cardWRatio, cardHRatio, marginRatio) {
  if (!carBox || !carBox.ok) return 'left'; // no measurement → assume sky top-left

  // The card occupies vertical space from the top margin to margin + card height.
  // Require the car's top in that x-range to be a little below the card's bottom.
  const cardBottom = marginRatio + cardHRatio;
  const gap = 0.02;
  const leftTop = topEdgeInRange(carBox, 0, cardWRatio);
  const rightTop = topEdgeInRange(carBox, 1 - cardWRatio, 1);

  const leftClear = leftTop >= cardBottom + gap;
  const rightClear = rightTop >= cardBottom + gap;

  if (leftClear && leftTop >= rightTop) return 'left';
  if (rightClear) return 'right';
  if (leftClear) return 'left';
  return 'banner';
}

/**
 * Apply the marketing tag.
 *
 * @param {Buffer} imageBuffer  the finished image (already at delivery size)
 * @param {object} opts
 * @param {'corner'|'banner'} opts.style
 * @param {object} opts.brand   resolved brand style (from resolveBrand)
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {string} [opts.footer]
 * @param {{x:number,y:number,w:number,h:number,ok:boolean}|null} [opts.carBox]
 *        the vehicle's box (0..1) from the auto-framer, so the corner tag can
 *        avoid it WITHOUT this module doing raw-pixel work of its own.
 * @returns {Promise<{buffer:Buffer, placement:string}>}
 */
export async function applyMarketingTag(imageBuffer, { style, brand, title, subtitle, footer, carBox }) {
  ensureFonts();
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width;
  const H = meta.height;

  const copy = {
    title: (title || brand.title || '').trim(),
    subtitle: (subtitle || brand.subtitle || '').trim(),
    footer: (footer || brand.footer || '').trim(),
  };

  // Corner card dimensions as ratios of the frame. Kept compact so it fits in a
  // top corner alongside a large car more often before falling back to a banner.
  const cardWRatio = 0.4;
  const cardHRatio = 0.165;
  const marginRatio = 0.03;

  let placement =
    style === 'banner'
      ? 'banner'
      : chooseCorner(carBox || null, cardWRatio, cardHRatio, marginRatio);

  const layers = [];

  if (placement === 'banner') {
    const svg = bannerSvg({ W, H, brand, ...copy });
    layers.push({ input: await raster(svg), top: 0, left: 0 });

    // Logo chips on the header (left) and footer (left).
    const headH = Math.round(H * 0.13);
    const footH = Math.round(H * 0.088);
    const headChip = headH - Math.round(headH * 0.36);
    const footChip = footH - Math.round(footH * 0.4);
    const [hc, fc] = await Promise.all([brandChip(brand, headChip), brandChip(brand, footChip)]);
    layers.push({ input: hc, top: Math.round((headH - headChip) / 2), left: Math.round(W * 0.012) });
    layers.push({
      input: fc,
      top: H - footH + Math.round((footH - footChip) / 2),
      left: Math.round(W * 0.012),
    });
  } else {
    const w = Math.round(W * cardWRatio);
    const h = Math.round(H * cardHRatio);
    const margin = Math.round(H * marginRatio);
    const left = placement === 'right' ? W - w - margin : margin;
    const top = margin;

    const svg = cornerCardSvg({ w, h, brand, ...copy });
    // The SVG already has a white rounded rect with the accent band inside it.
    const card = await raster(svg);
    layers.push({ input: card, top, left });

    // Logo chip inside the card's white area, vertically centred on the text
    // block. These match the sizing inside cornerCardSvg().
    const pad = Math.round(h * 0.15);
    const bandH = Math.round(h * 0.24);
    const chipSize = h - pad * 2 - bandH;
    const chip = await brandChip(brand, chipSize);
    layers.push({ input: chip, top: top + pad, left: left + pad });
  }

  const buffer = await sharp(imageBuffer).composite(layers).png().toBuffer();
  logger.info(`Applied ${brand.name} marketing tag (${placement}).`);
  return { buffer, placement };
}

export default { applyMarketingTag };
