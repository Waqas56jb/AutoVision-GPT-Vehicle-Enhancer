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
 * Two layouts, chosen by the operator — they never convert into each other:
 *   corner — compact card in a top corner (the product default look).
 *            May shrink or switch corner if the car is in the way.
 *            NEVER becomes a full-width banner.
 *   banner — full-width header + footer. Only when the operator picks it.
 *
 * Everything is deterministic SVG composited with sharp. Text uses bundled Roboto.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.resolve(here, '../../assets/logos');

async function raster(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const textWidth = (s, size, weight = 400) =>
  String(s).length * size * (weight >= 700 ? 0.66 : 0.57);

function fitSize(s, size, maxWidth, weight, floor = 12) {
  let f = size;
  while (f > floor && textWidth(s, f, weight) > maxWidth) f -= 1;
  return f;
}

function findLogo(key) {
  if (!key) return null;
  for (const ext of ['png', 'svg', 'jpg', 'jpeg', 'webp']) {
    const p = path.join(LOGO_DIR, `${key}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Official logo, contain-fit (never stretched). Null if none on disk. */
async function loadLogoContain(brand, maxW, maxH) {
  const logo = findLogo(brand.key);
  if (!logo) return null;
  try {
    return await sharp(logo)
      .resize(Math.max(1, maxW), Math.max(1, maxH), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Map stored brand fields onto the IMAGE-2 visual hierarchy.
 * Operator custom copy always wins; defaults get a light presentation tweak.
 */
function displayCopy(brand, title, subtitle, footer) {
  const customTitle = typeof title === 'string' ? title.trim() : '';
  const customSub = typeof subtitle === 'string' ? subtitle.trim() : '';
  const customFoot = typeof footer === 'string' ? footer.trim() : '';

  let t = customTitle || brand.title || '';
  let s = customSub || brand.subtitle || '';
  let f = customFoot || brand.footer || '';

  if (!customTitle && brand.key === 'kia') {
    t = 'Balance of Kia Warranty Applies';
  }
  if (!customFoot && f && !/^dealership backed/i.test(f)) {
    f = `Dealership Backed, ${f}`;
  }

  return { title: t, subtitle: s, footer: f };
}

/**
 * Compact top-corner card (IMAGE 2).
 * Footer is a BLACK strip the width of the CARD only — never the photo.
 * Fallback mark is a coloured wordmark, never a square letter-tile.
 */
function cornerCardSvg({ w, h, brand, title, subtitle, footer, hasLogo }) {
  const pad = Math.round(w * 0.035);
  const footerH = Math.round(h * 0.265);
  const bodyH = h - footerH;
  const logoBoxH = Math.round(bodyH * 0.56);
  const logoBoxW = hasLogo ? Math.round(logoBoxH * 1.2) : Math.round(w * 0.2);
  const titleX = pad + logoBoxW + Math.round(w * 0.028);
  const titleW = Math.max(24, w - titleX - pad);

  const titleSize = fitSize(title, Math.round(bodyH * 0.28), titleW, 700, 11);
  const subSize = subtitle ? fitSize(subtitle, Math.round(bodyH * 0.18), titleW, 500, 9) : 0;
  const footSize = fitSize(footer, Math.round(footerH * 0.38), w - pad * 2, 700, 9);

  const titleY = Math.round(bodyH * 0.42);
  const subY = Math.round(bodyH * 0.72);

  const wordmark = hasLogo
    ? ''
    : `<text x="${pad}" y="${Math.round(bodyH * 0.58)}"
          font-family="${FONT_FAMILY}" font-weight="800"
          font-size="${Math.round(bodyH * 0.32)}" fill="${esc(brand.accent)}">${esc(
        (brand.name || 'MAKE').toUpperCase()
      )}</text>`;

  const subtitleSvg = subtitle
    ? `<text x="${titleX}" y="${subY}" font-family="${FONT_FAMILY}" font-weight="500"
          font-size="${subSize}" fill="#252525">${esc(subtitle)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="1" ry="1" fill="#ffffff"/>
    ${wordmark}
    <text x="${titleX}" y="${titleY}" font-family="${FONT_FAMILY}" font-weight="700"
          font-size="${titleSize}" fill="#111111">${esc(title)}</text>
    ${subtitleSvg}
    <rect x="0" y="${bodyH}" width="${w}" height="${footerH}" fill="#000000"/>
    <text x="${w / 2}" y="${bodyH + footerH * 0.64}" text-anchor="middle"
          font-family="${FONT_FAMILY}" font-weight="700" font-size="${footSize}"
          fill="#ffffff">${esc(footer)}</text>
  </svg>`;
}

/** Full-width bands — only when the operator explicitly picks banner. */
function bannerSvg({ W, H, brand, title, subtitle, footer }) {
  const headH = Math.round(H * 0.13);
  const footH = Math.round(H * 0.088);
  const chip = headH - Math.round(headH * 0.36);
  const tx = Math.round(W * 0.012) + chip + Math.round(W * 0.02);
  const titleSize = fitSize(title, Math.round(headH * 0.4), W - tx - Math.round(W * 0.03), 800, 16);
  const subSize = fitSize(subtitle, Math.round(headH * 0.22), W - tx - Math.round(W * 0.03), 400, 11);
  const footSize = Math.round(footH * 0.4);

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${headH}" fill="#0b1220" fill-opacity="0.92"/>
    <rect x="0" y="${headH}" width="${W}" height="3" fill="${brand.accent}"/>
    <text x="${tx}" y="${Math.round(headH * 0.44)}" font-family="${FONT_FAMILY}" font-weight="800"
          font-size="${titleSize}" fill="#ffffff">${esc(title)}</text>
    <text x="${tx}" y="${Math.round(headH * 0.44) + subSize * 1.5}" font-family="${FONT_FAMILY}"
          font-weight="400" font-size="${subSize}" fill="#c7d2e0">${esc(subtitle)}</text>
    <rect x="0" y="${H - footH}" width="${W}" height="${footH}" fill="#000000"/>
    <text x="${W / 2}" y="${H - footH / 2}" text-anchor="middle" dominant-baseline="central"
          font-family="${FONT_FAMILY}" font-weight="800" font-size="${footSize}"
          fill="#ffffff" letter-spacing="1.2">${esc(footer.toUpperCase())}</text>
  </svg>`;
}

function bannerWordmark(brand, size) {
  const label = esc((brand.name || 'MAKE').toUpperCase());
  const svg = `<svg width="${size * 2}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="50%" dominant-baseline="central" font-family="${FONT_FAMILY}"
          font-weight="800" font-size="${Math.round(size * 0.45)}" fill="#ffffff">${label}</text>
  </svg>`;
  return raster(svg);
}

function cornerClear(carBox, wRatio, hRatio, marginRatio, side) {
  const cardBottom = marginRatio + hRatio;
  const gap = 0.02;
  const top =
    side === 'left'
      ? topEdgeInRange(carBox, 0, wRatio)
      : topEdgeInRange(carBox, 1 - wRatio, 1);
  return top >= cardBottom + gap;
}

/**
 * Pick a top corner for the compact card.
 * Returns { side, wRatio, hRatio, fallback }. Never returns banner.
 */
function chooseCorner(carBox, cardWRatio, cardHRatio, marginRatio) {
  const pick = (wR, hR, fallback) => {
    const open = !carBox || !carBox.ok;
    const left = open || cornerClear(carBox, wR, hR, marginRatio, 'left');
    const right = open || cornerClear(carBox, wR, hR, marginRatio, 'right');
    if (left) return { side: 'left', wRatio: wR, hRatio: hR, fallback };
    if (right) return { side: 'right', wRatio: wR, hRatio: hR, fallback };
    return null;
  };

  return (
    pick(cardWRatio, cardHRatio, false) ||
    pick(0.32, 0.135, true) || {
      side: 'left',
      wRatio: 0.32,
      hRatio: 0.135,
      fallback: true,
    }
  );
}

/**
 * @returns {Promise<{buffer:Buffer, placement:string}>}
 */
export async function applyMarketingTag(imageBuffer, { style, brand, title, subtitle, footer, carBox }) {
  ensureFonts();
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width;
  const H = meta.height;
  const copy = displayCopy(brand, title, subtitle, footer);
  const layers = [];

  if (style === 'banner') {
    const svg = bannerSvg({ W, H, brand, ...copy });
    layers.push({ input: await raster(svg), top: 0, left: 0 });

    const headH = Math.round(H * 0.13);
    const logoBuf = await loadLogoContain(brand, Math.round(headH * 0.7), Math.round(headH * 0.55));
    if (logoBuf) {
      const lm = await sharp(logoBuf).metadata();
      layers.push({
        input: logoBuf,
        top: Math.round((headH - (lm.height || 0)) / 2),
        left: Math.round(W * 0.012),
      });
    } else {
      const chip = Math.round(headH * 0.55);
      layers.push({
        input: await bannerWordmark(brand, chip),
        top: Math.round((headH - chip) / 2),
        left: Math.round(W * 0.012),
      });
    }

    const buffer = await sharp(imageBuffer).composite(layers).png().toBuffer();
    logger.info(`Applied ${brand.name} marketing tag (banner).`);
    return { buffer, placement: 'banner' };
  }

  /* Corner is a bounded overlay. It may change size and side, never footprint → 100%. */
  const cardWRatio = 0.4;
  const cardHRatio = 0.17;
  const marginRatio = 0.03;
  const place = chooseCorner(carBox || null, cardWRatio, cardHRatio, marginRatio);

  const w = Math.round(W * place.wRatio);
  const h = Math.round(H * place.hRatio);
  const margin = Math.round(H * marginRatio);
  const left = place.side === 'right' ? W - w - margin : margin;
  const top = margin;

  const pad = Math.round(w * 0.035);
  const footerH = Math.round(h * 0.265);
  const bodyH = h - footerH;
  const logoBoxH = Math.round(bodyH * 0.56);
  const logoBoxW = Math.round(logoBoxH * 1.2);
  const logoBuf = await loadLogoContain(brand, logoBoxW, logoBoxH);

  const svg = cornerCardSvg({
    w,
    h,
    brand,
    ...copy,
    hasLogo: Boolean(logoBuf),
  });
  layers.push({ input: await raster(svg), top, left });

  if (logoBuf) {
    const lm = await sharp(logoBuf).metadata();
    const lh = lm.height || logoBoxH;
    layers.push({
      input: logoBuf,
      top: top + Math.round((bodyH - lh) / 2),
      left: left + pad,
    });
  }

  const buffer = await sharp(imageBuffer).composite(layers).png().toBuffer();
  const placement = `${place.side}${place.fallback ? '-compact' : ''}`;
  logger.info(`Applied ${brand.name} marketing tag (corner:${placement}, ${w}x${h}).`);
  return { buffer, placement };
}

export default { applyMarketingTag };
