/**
 * Marketing tag model — the dealer's warranty badge / header / footer that sits
 * on top of a finished photo.
 *
 * Tags are drawn in the browser AFTER the AI render, never baked in by the
 * server. That is what gives the client the control they asked for:
 *   1. pick the corner (top-left / top-right / bottom-left / bottom-right),
 *   2. pick WHICH photos get a tag (first photo, exterior shots, all, or hand-picked),
 *   3. use different tags on different photos (a saved library of tags),
 *   4. set colours, fonts and upload brand logos — or their own finished tag graphic.
 * Changing a tag never re-runs (or re-bills) the OpenAI render.
 */

export const TAG_TYPES = [
  { value: 'card', label: 'Corner tag', hint: 'Logo + warranty text in a corner' },
  { value: 'image', label: 'Your own graphic', hint: 'Upload a finished tag (PNG)' },
  { value: 'header', label: 'Header', hint: 'Band across the top' },
  { value: 'footer', label: 'Footer', hint: 'Band across the bottom' },
  { value: 'headerFooter', label: 'Header + footer', hint: 'Both bands' },
];

export const CORNERS = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

/** Which photos a tag lands on automatically. Per-photo switches override this. */
export const APPLY_RULES = [
  { value: 'first', label: 'First photo', hint: 'Only the first car photo' },
  { value: 'exterior', label: 'Exterior shots', hint: 'Every outside shot' },
  { value: 'all', label: 'Every photo', hint: 'Interior shots too' },
  { value: 'manual', label: 'Photos I pick', hint: 'Switch it on per photo' },
];

/** Google fonts loaded in index.html. Custom uploaded fonts are added at runtime. */
export const FONTS = [
  { family: 'Montserrat', label: 'Montserrat' },
  { family: 'Inter', label: 'Inter' },
  { family: 'Roboto', label: 'Roboto' },
  { family: 'Open Sans', label: 'Open Sans' },
  { family: 'Poppins', label: 'Poppins' },
  { family: 'Oswald', label: 'Oswald (condensed)' },
  { family: 'Barlow Condensed', label: 'Barlow Condensed' },
  { family: 'Bebas Neue', label: 'Bebas Neue (caps)' },
  { family: 'Anton', label: 'Anton (bold caps)' },
  { family: 'Archivo Black', label: 'Archivo Black' },
  { family: 'Playfair Display', label: 'Playfair Display (serif)' },
];

export const DEFAULT_FONT = 'Montserrat';

/** Size limits, as fractions of the photo. */
export const SIZE_RANGE = { min: 0.18, max: 0.6 }; // corner tag / graphic width
export const HEADER_RANGE = { min: 0.07, max: 0.22 }; // header band height
export const FOOTER_RANGE = { min: 0.05, max: 0.16 }; // footer band height

const DEFAULT_COLORS = {
  cardBg: '#ffffff',
  cardTitle: '#111111',
  cardSubtitle: '#3a3a3a',
  stripBg: '#000000',
  stripText: '#ffffff',
  headerBg: '#0b1220',
  headerTitle: '#ffffff',
  headerSubtitle: '#c7d2e0',
  accent: '#e11d48',
  footerBg: '#000000',
  footerText: '#ffffff',
};

export const COLOR_FIELDS = {
  card: [
    ['cardBg', 'Tag background'],
    ['cardTitle', 'Title text'],
    ['cardSubtitle', 'Subtitle text'],
    ['stripBg', 'Bottom strip'],
    ['stripText', 'Strip text'],
  ],
  header: [
    ['headerBg', 'Header background'],
    ['headerTitle', 'Title text'],
    ['headerSubtitle', 'Subtitle text'],
    ['accent', 'Accent line'],
  ],
  footer: [
    ['footerBg', 'Footer background'],
    ['footerText', 'Footer text'],
  ],
};
COLOR_FIELDS.headerFooter = [...COLOR_FIELDS.header, ...COLOR_FIELDS.footer];
COLOR_FIELDS.image = [];

/**
 * Quick-start styling per manufacturer. The operator still uploads the dealer's
 * own logo file — the app ships no manufacturer artwork.
 */
export const BRAND_PRESETS = [
  { key: 'audi', name: 'Audi', accent: '#bb0a30', title: 'Balance of Audi Warranty', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
  { key: 'bmw', name: 'BMW', accent: '#0166b1', title: 'Balance of BMW Warranty', subtitle: 'BMW ConnectedDrive services included', footer: 'Dealer backed & verified' },
  { key: 'ford', name: 'Ford', accent: '#00274e', title: 'Balance of Ford Warranty Applies', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
  { key: 'gwm', name: 'GWM', accent: '#b1060f', title: 'Balance of GWM Warranty', subtitle: '7-year unlimited km warranty', footer: 'Dealer backed & verified' },
  { key: 'honda', name: 'Honda', accent: '#e11d1d', title: 'Honda Warranty Applies', subtitle: 'Unlimited KM warranty & roadside assist', footer: 'Honda dealer backed & verified' },
  { key: 'hyundai', name: 'Hyundai', accent: '#002c5f', title: 'Balance of Hyundai Warranty Applies', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealership backed, inspected & verified' },
  { key: 'isuzu', name: 'Isuzu', accent: '#c8102e', title: 'Balance of Isuzu UTE Warranty', subtitle: '6-year / 150,000 km warranty', footer: 'Dealer backed & verified' },
  { key: 'kia', name: 'Kia', accent: '#05141f', title: '7 Year Factory Warranty', subtitle: 'Capped price servicing available', footer: 'Authorised Kia dealer' },
  { key: 'ldv', name: 'LDV', accent: '#f26a21', title: '7 Year | 200,000 KM Warranty', subtitle: 'Dealer backed, inspected & verified', footer: 'Dealer backed & verified' },
  { key: 'lexus', name: 'Lexus', accent: '#1a1a1a', title: 'Balance of Lexus Warranty', subtitle: 'Lexus Encore owner benefits included', footer: 'Lexus dealer backed & verified' },
  { key: 'mazda', name: 'Mazda', accent: '#101820', title: 'Mazda Warranty Still Applies', subtitle: 'Genuine Mazda accessories & Apple CarPlay', footer: 'Workshop inspected & verified' },
  { key: 'mercedes', name: 'Mercedes-Benz', accent: '#111111', title: 'Balance of Mercedes-Benz Warranty', subtitle: 'Mercedes me connect included', footer: 'Dealer backed & verified' },
  { key: 'mg', name: 'MG', accent: '#d0102f', title: 'Still Covered by MG Warranty', subtitle: 'Workshop inspected, tested & verified', footer: 'Dealer backed & verified' },
  { key: 'mitsubishi', name: 'Mitsubishi', accent: '#e60012', title: 'Balance of Mitsubishi Diamond Warranty', subtitle: 'Capped price servicing available', footer: 'Dealer backed & verified' },
  { key: 'nissan', name: 'Nissan', accent: '#c3002f', title: 'Balance of Nissan Warranty Applies', subtitle: 'Including Roadside Assistance', footer: 'Full Nissan service history' },
  { key: 'subaru', name: 'Subaru', accent: '#0033a0', title: 'Balance of Subaru Warranty Applies', subtitle: 'Wireless Apple CarPlay & Android Auto', footer: 'Dealership backed, inspected & verified' },
  { key: 'suzuki', name: 'Suzuki', accent: '#e10a1c', title: 'Balance of Suzuki Warranty', subtitle: 'Dealer backed, inspected & verified', footer: 'Dealer backed & verified' },
  { key: 'tesla', name: 'Tesla', accent: '#171a20', title: 'Balance of Tesla Warranty', subtitle: 'Over-the-air updates & Supercharging ready', footer: 'Dealer backed & verified' },
  { key: 'toyota', name: 'Toyota', accent: '#eb0a1e', title: 'Balance of Toyota New Car Warranty', subtitle: 'Toyota Safety Sense driver assistance', footer: 'Toyota dealer backed & verified' },
  { key: 'volkswagen', name: 'Volkswagen', accent: '#001e50', title: 'Balance of Volkswagen Warranty', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
];

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const clamp = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const dataUrl = (v) => (typeof v === 'string' && v.startsWith('data:image/') ? v : null);

/** A new tag with sensible defaults, merged with any overrides. */
export function createTag(overrides = {}) {
  const now = Date.now();
  return normaliseTag({
    id: uid(),
    name: 'New tag',
    type: 'card',
    corner: 'top-right',
    size: 0.36,
    headerSize: 0.12,
    footerSize: 0.075,
    applyTo: 'first',
    title: 'Balance of Factory Warranty',
    subtitle: 'Dealer backed, inspected & verified',
    footer: 'Dealer backed & verified',
    uppercaseFooter: true,
    font: DEFAULT_FONT,
    logo: null,
    graphic: null,
    logoSide: 'left',
    logoPlate: true,
    bandOpacity: 0.94,
    colors: { ...DEFAULT_COLORS },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

/**
 * Coerce anything (a saved record, an imported file) into a valid tag, so a bad
 * import can never crash the renderer.
 */
export function normaliseTag(raw = {}) {
  const colors = { ...DEFAULT_COLORS };
  for (const k of Object.keys(DEFAULT_COLORS)) {
    if (isHex(raw.colors?.[k])) colors[k] = raw.colors[k].toLowerCase();
  }
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name: str(raw.name, 60).trim() || 'Untitled tag',
    type: pick(raw.type, TAG_TYPES.map((t) => t.value), 'card'),
    corner: pick(raw.corner, CORNERS.map((c) => c.value), 'top-right'),
    size: clamp(raw.size, SIZE_RANGE.min, SIZE_RANGE.max, 0.36),
    headerSize: clamp(raw.headerSize, HEADER_RANGE.min, HEADER_RANGE.max, 0.12),
    footerSize: clamp(raw.footerSize, FOOTER_RANGE.min, FOOTER_RANGE.max, 0.075),
    applyTo: pick(raw.applyTo, APPLY_RULES.map((r) => r.value), 'first'),
    title: str(raw.title, 80),
    subtitle: str(raw.subtitle, 120),
    footer: str(raw.footer, 90),
    uppercaseFooter: raw.uppercaseFooter !== false,
    font: typeof raw.font === 'string' && raw.font ? raw.font.slice(0, 80) : DEFAULT_FONT,
    logo: dataUrl(raw.logo),
    graphic: dataUrl(raw.graphic),
    logoSide: raw.logoSide === 'right' ? 'right' : 'left',
    // Most maker logos are dark; on a dark header they vanish without a light plate.
    logoPlate: raw.logoPlate !== false,
    bandOpacity: clamp(raw.bandOpacity, 0.5, 1, 0.94),
    colors,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

/** Copy a brand's colours and wording onto a tag (keeps its logo, corner, rule). */
export function applyBrandPreset(tag, brandKey) {
  const b = BRAND_PRESETS.find((x) => x.key === brandKey);
  if (!b) return tag;
  return normaliseTag({
    ...tag,
    name: tag.name === 'New tag' || !tag.name ? `${b.name} warranty` : tag.name,
    title: b.title,
    subtitle: b.subtitle,
    footer: b.footer,
    colors: {
      ...tag.colors,
      stripBg: b.accent,
      stripText: '#ffffff',
      headerBg: b.accent,
      headerTitle: '#ffffff',
      headerSubtitle: '#e5e7eb',
      accent: '#ffffff',
    },
  });
}

/** Does this tag land on this photo by its rule alone (before per-photo switches)? */
export function ruleApplies(tag, result) {
  switch (tag.applyTo) {
    case 'all':
      return true;
    case 'first':
      return result?.vIndex === 0;
    case 'exterior':
      // Unknown until the render reports its shot type; treat unknown as exterior.
      return !result?.meta?.shotType || result.meta.shotType === 'exterior';
    default:
      return false;
  }
}

/**
 * The tags drawn on one photo, in library order.
 * @param {object[]} library
 * @param {object} result
 * @param {Record<string, Record<string, boolean>>} overrides  per-photo switches
 */
export function tagsForResult(library, result, overrides) {
  if (!result) return [];
  const own = overrides?.[result.key] || {};
  return library.filter((t) => (t.id in own ? own[t.id] : ruleApplies(t, result)));
}

/** Tags actually usable for drawing (a graphic tag with no graphic draws nothing). */
export function isDrawable(tag) {
  return tag.type !== 'image' || Boolean(tag.graphic);
}

/** Cheap change-detector for a tag list — avoids re-hashing multi-MB data URLs. */
export function tagsSignature(tags) {
  return JSON.stringify(
    (tags || []).map((t) => ({
      ...t,
      logo: t.logo ? `${t.logo.length}:${t.logo.slice(-32)}` : null,
      graphic: t.graphic ? `${t.graphic.length}:${t.graphic.slice(-32)}` : null,
    }))
  );
}

export const describeTag = (tag) => {
  const type = TAG_TYPES.find((t) => t.value === tag.type)?.label || tag.type;
  const where =
    tag.type === 'card' || tag.type === 'image'
      ? CORNERS.find((c) => c.value === tag.corner)?.label
      : null;
  return where ? `${type} · ${where}` : type;
};
