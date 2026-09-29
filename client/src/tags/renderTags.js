import { isDrawable } from './tagModel.js';

/**
 * Draws marketing tags onto a finished photo with the 2D canvas.
 *
 * One renderer serves the live preview AND the downloaded file, so what the
 * operator sees on the stage is exactly what lands in the ZIP. Every size is a
 * fraction of the photo, so a 320px thumbnail and a 1280×853 Carsales export
 * are the same layout at different scales.
 *
 * Layout rules:
 *   - header / footer bands are drawn first, across the full width;
 *   - corner tags and graphics sit inside the bands (never under them);
 *   - two tags in the same corner stack instead of overlapping.
 */

const FALLBACK_STACK = 'Inter, Arial, Helvetica, sans-serif';
const W_TITLE = 800;
const W_SUB = 500;
const W_STRIP = 700;

const fontCss = (weight, size, family) =>
  `${weight} ${Math.max(1, Math.round(size * 10) / 10)}px "${family}", ${FALLBACK_STACK}`;

/* ── Image + font loading ──────────────────────────────────────────── */

const imageCache = new Map();
const IMAGE_CACHE_MAX = 60;

/** Load (and cache) an image from a data/blob/http URL. */
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });
  p.catch(() => imageCache.delete(src));
  imageCache.set(src, p);
  if (imageCache.size > IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value);
  return p;
}

/** Make sure every font a tag uses is downloaded before we draw text with it. */
async function ensureFonts(tags) {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const families = [...new Set(tags.map((t) => t.font))];
  await Promise.all(
    families.flatMap((family) =>
      [W_SUB, W_STRIP, W_TITLE].map((w) =>
        document.fonts.load(fontCss(w, 32, family), 'AaBb0').catch(() => [])
      )
    )
  );
}

async function prepare(tags) {
  const list = (tags || []).filter(isDrawable);
  const images = new Map();
  const sources = [...new Set(list.flatMap((t) => [t.logo, t.graphic]).filter(Boolean))];
  await Promise.all(
    sources.map(async (src) => {
      try {
        images.set(src, await loadImage(src));
      } catch {
        /* A broken logo is skipped, never fatal. */
      }
    })
  );
  await ensureFonts(list);
  return { list, images };
}

/* ── Drawing helpers ───────────────────────────────────────────────── */

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Contain-fit an image into a box (never stretched). */
function containSize(img, maxW, maxH) {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const s = Math.min(maxW / iw, maxH / ih);
  return { w: iw * s, h: ih * s };
}

/**
 * Largest font size (≤ max) at which `text` fits `maxWidth`. If it still does
 * not fit at `min`, the text is cut with an ellipsis rather than overflowing.
 */
function fitText(ctx, text, family, weight, max, min, maxWidth) {
  let size = max;
  const step = Math.max(0.5, max * 0.04);
  ctx.font = fontCss(weight, size, family);
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size = Math.max(min, size - step);
    ctx.font = fontCss(weight, size, family);
  }
  let out = text;
  if (ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    out = `${out.trimEnd()}…`;
  }
  return { size, text: out };
}

/** Title + optional subtitle, vertically centred in a box. */
function drawTextBlock(ctx, { x, y, w, h, title, subtitle, family, titleColor, subColor, titleMax, subMax, align = 'left' }) {
  const t = (title || '').trim();
  const s = (subtitle || '').trim();
  if ((!t && !s) || w < 6) return;

  const T = t ? fitText(ctx, t, family, W_TITLE, titleMax, titleMax * 0.45, w) : null;
  const S = s ? fitText(ctx, s, family, W_SUB, subMax, subMax * 0.5, w) : null;
  const gap = T && S ? h * 0.07 : 0;
  const total = (T ? T.size : 0) + gap + (S ? S.size : 0);
  let cy = y + (h - total) / 2;
  const tx = align === 'center' ? x + w / 2 : x;

  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (T) {
    ctx.font = fontCss(W_TITLE, T.size, family);
    ctx.fillStyle = titleColor;
    ctx.fillText(T.text, tx, cy + T.size / 2);
    cy += T.size + gap;
  }
  if (S) {
    ctx.font = fontCss(W_SUB, S.size, family);
    ctx.fillStyle = subColor;
    ctx.fillText(S.text, tx, cy + S.size / 2);
  }
}

function setLetterSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

/* ── Tag types ─────────────────────────────────────────────────────── */

function drawHeader(ctx, W, H, tag, images) {
  const h = Math.round(H * tag.headerSize);
  const c = tag.colors;
  const line = Math.max(2, Math.round(H * 0.004));
  const pad = Math.round(W * 0.022);

  ctx.save();
  ctx.globalAlpha = tag.bandOpacity;
  ctx.fillStyle = c.headerBg;
  ctx.fillRect(0, 0, W, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, h, W, line);

  let left = pad;
  let right = W - pad;
  const logo = tag.logo && images.get(tag.logo);
  if (logo) {
    const plate = tag.logoPlate;
    const inset = plate ? h * 0.1 : 0; // logo padding inside the plate
    const box = containSize(logo, h * 2.6, h * (plate ? 0.5 : 0.64));
    const outerW = box.w + inset * 2;
    const outerH = box.h + inset * 2;
    const ox = tag.logoSide === 'right' ? W - pad - outerW : pad;
    const oy = (h - outerH) / 2;
    if (plate) {
      roundRectPath(ctx, ox, oy, outerW, outerH, outerH * 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.drawImage(logo, ox + inset, oy + inset, box.w, box.h);
    if (tag.logoSide === 'right') right = ox - pad;
    else left = ox + outerW + pad;
  }

  drawTextBlock(ctx, {
    x: left,
    y: 0,
    w: right - left,
    h,
    title: tag.title,
    subtitle: tag.subtitle,
    family: tag.font,
    titleColor: c.headerTitle,
    subColor: c.headerSubtitle,
    titleMax: h * 0.36,
    subMax: h * 0.2,
  });
  ctx.restore();
  return h + line;
}

function drawFooter(ctx, W, H, tag) {
  const h = Math.round(H * tag.footerSize);
  const c = tag.colors;
  const y = H - h;

  ctx.save();
  ctx.globalAlpha = tag.bandOpacity;
  ctx.fillStyle = c.footerBg;
  ctx.fillRect(0, y, W, h);
  ctx.globalAlpha = 1;

  const raw = (tag.footer || '').trim();
  if (raw) {
    const label = tag.uppercaseFooter ? raw.toUpperCase() : raw;
    setLetterSpacing(ctx, Math.max(0.5, h * 0.02));
    const f = fitText(ctx, label, tag.font, W_STRIP, h * 0.42, h * 0.22, W * 0.94);
    ctx.font = fontCss(W_STRIP, f.size, tag.font);
    ctx.fillStyle = c.footerText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.text, W / 2, y + h / 2);
  }
  ctx.restore();
  return h;
}

function cardSize(W, tag) {
  const w = Math.round(W * tag.size);
  const hasStrip = Boolean((tag.footer || '').trim());
  return { w, h: Math.round(w * (hasStrip ? 0.3 : 0.22)), hasStrip };
}

function drawCard(ctx, x, y, dims, tag, images) {
  const { w, h, hasStrip } = dims;
  const c = tag.colors;
  const r = Math.round(h * 0.06);
  const stripH = hasStrip ? Math.round(h * 0.28) : 0;
  const bodyH = h - stripH;

  ctx.save();
  // Soft drop shadow so a white tag still reads against a white showroom.
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = Math.round(w * 0.035);
  ctx.shadowOffsetY = Math.round(w * 0.01);
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = c.cardBg;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();

  if (hasStrip) {
    ctx.fillStyle = c.stripBg;
    ctx.fillRect(x, y + bodyH, w, stripH);
    const raw = tag.footer.trim();
    const label = tag.uppercaseFooter ? raw.toUpperCase() : raw;
    setLetterSpacing(ctx, Math.max(0.3, stripH * 0.02));
    const f = fitText(ctx, label, tag.font, W_STRIP, stripH * 0.46, stripH * 0.25, w * 0.92);
    ctx.font = fontCss(W_STRIP, f.size, tag.font);
    ctx.fillStyle = c.stripText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.text, x + w / 2, y + bodyH + stripH / 2);
    setLetterSpacing(ctx, 0);
  }

  const pad = Math.round(bodyH * 0.14);
  const hasText = Boolean((tag.title || '').trim() || (tag.subtitle || '').trim());
  let textX = x + pad;
  const logo = tag.logo && images.get(tag.logo);
  if (logo) {
    const maxW = hasText ? Math.min(bodyH * 1.7, w * 0.34) : w - pad * 2;
    const box = containSize(logo, maxW, bodyH - pad * 2);
    const lx = hasText ? x + pad : x + (w - box.w) / 2;
    ctx.drawImage(logo, lx, y + (bodyH - box.h) / 2, box.w, box.h);
    textX = lx + box.w + pad * 0.9;
  }

  drawTextBlock(ctx, {
    x: textX,
    y,
    w: x + w - pad - textX,
    h: bodyH,
    title: tag.title,
    subtitle: tag.subtitle,
    family: tag.font,
    titleColor: c.cardTitle,
    subColor: c.cardSubtitle,
    titleMax: bodyH * 0.3,
    subMax: bodyH * 0.19,
  });
  ctx.restore();
}

function graphicSize(W, H, tag, img) {
  let w = W * tag.size;
  let h = (w * (img.naturalHeight || 1)) / (img.naturalWidth || 1);
  const maxH = H * 0.7;
  if (h > maxH) {
    w *= maxH / h;
    h = maxH;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

/**
 * Draw a list of tags onto a context already holding the photo.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawTags(ctx, W, H, tags, images) {
  let topInset = 0;
  let bottomInset = 0;
  for (const t of tags) {
    if (t.type === 'header' || t.type === 'headerFooter') {
      topInset = Math.max(topInset, drawHeader(ctx, W, H, t, images));
    }
    if (t.type === 'footer' || t.type === 'headerFooter') {
      bottomInset = Math.max(bottomInset, drawFooter(ctx, W, H, t));
    }
  }

  const margin = Math.round(W * 0.022);
  const gap = Math.round(margin * 0.6);
  const used = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0 };

  for (const t of tags) {
    let dims;
    let img = null;
    if (t.type === 'card') dims = cardSize(W, t);
    else if (t.type === 'image') {
      img = images.get(t.graphic);
      if (!img) continue;
      dims = graphicSize(W, H, t, img);
    } else continue;

    const isTop = t.corner.startsWith('top');
    const isLeft = t.corner.endsWith('left');
    const x = isLeft ? margin : W - margin - dims.w;
    const y = isTop
      ? margin + topInset + used[t.corner]
      : H - margin - bottomInset - used[t.corner] - dims.h;
    used[t.corner] += dims.h + gap;

    if (t.type === 'card') drawCard(ctx, x, y, dims, t, images);
    else ctx.drawImage(img, x, y, dims.w, dims.h);
  }
}

/** Neutral stand-in photo for previews when no finished image exists yet. */
function drawPlaceholder(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#dfe8f5');
  sky.addColorStop(0.62, '#f4f7fb');
  sky.addColorStop(0.62, '#c9ced6');
  sky.addColorStop(1, '#a9b0ba');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // A simple car silhouette so tag scale reads in context.
  ctx.fillStyle = '#5b6573';
  const cx = W / 2;
  const base = H * 0.74;
  roundRectPath(ctx, cx - W * 0.36, base - H * 0.2, W * 0.72, H * 0.16, H * 0.05);
  ctx.fill();
  roundRectPath(ctx, cx - W * 0.2, base - H * 0.34, W * 0.38, H * 0.16, H * 0.06);
  ctx.fill();
  ctx.fillStyle = '#2b3038';
  for (const dx of [-0.24, 0.24]) {
    ctx.beginPath();
    ctx.arc(cx + W * dx, base - H * 0.03, H * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw photo + tags into a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string|null} baseSrc   the finished photo (null → placeholder scene)
 * @param {object[]} tags
 * @param {{width?:number, isCurrent?:()=>boolean}} [opts]
 * @returns {Promise<boolean>} false when a newer draw superseded this one
 */
export async function drawComposite(canvas, baseSrc, tags, opts = {}) {
  const [base, prepared] = await Promise.all([
    baseSrc ? loadImage(baseSrc) : Promise.resolve(null),
    prepare(tags),
  ]);
  if (opts.isCurrent && !opts.isCurrent()) return false;

  const natW = base?.naturalWidth || 1280;
  const natH = base?.naturalHeight || 853;
  const W = opts.width ? Math.round(opts.width) : natW;
  const H = Math.round((W * natH) / natW);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (base) ctx.drawImage(base, 0, 0, W, H);
  else drawPlaceholder(ctx, W, H);
  drawTags(ctx, W, H, prepared.list, prepared.images);
  return true;
}

/** Full-resolution photo + tags as a Blob (PNG by default). */
export async function compositeToBlob(baseSrc, tags, type = 'image/png', quality) {
  const canvas = document.createElement('canvas');
  await drawComposite(canvas, baseSrc, tags);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not export the tagged image.'))),
      type,
      quality
    )
  );
}
