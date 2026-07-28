/**
 * Per-manufacturer styling and default warranty copy for the marketing tag.
 *
 * The tag names the car's maker so a dealer can market the specific vehicle they
 * are selling (a legitimate descriptive use). We do NOT reproduce trademarked
 * logo artwork — the badge is set typographically in the maker's accent colour.
 * If a dealer wants the official logo, they drop an approved image at
 * `server/assets/logos/<key>.png` and the overlay engine picks it up
 * automatically (see overlay.service.js). Their brand assets, their rights.
 *
 * `accent` is the band/keyline colour. `title`/`subtitle`/`footer` are defaults;
 * the operator can override the text per job from the UI.
 */

/** Fallback used when the make is identified but not in the table below. */
const GENERIC = {
  key: 'generic',
  name: 'Manufacturer',
  accent: '#1f2937',
  accentText: '#ffffff',
  title: 'Balance of Factory Warranty',
  subtitle: 'Dealer backed, inspected & verified',
  footer: 'Dealer backed & verified',
};

/**
 * key: lowercase, matches what the vision detector returns.
 * name: display name.
 * accent: primary brand colour (band + keyline).
 * accentText: text colour that reads on `accent`.
 */
export const BRANDS = {
  honda: { name: 'Honda', accent: '#e11d1d', accentText: '#ffffff', title: 'Honda Warranty Applies', subtitle: 'Unlimited KM warranty & premium roadside assist', footer: 'Honda dealer backed & verified' },
  toyota: { name: 'Toyota', accent: '#eb0a1e', accentText: '#ffffff', title: 'Balance of Toyota New Car Warranty', subtitle: 'Equipped with Toyota Safety Sense driver assistance', footer: 'Toyota dealer backed & verified' },
  lexus: { name: 'Lexus', accent: '#1a1a1a', accentText: '#ffffff', title: 'Balance of Lexus Warranty', subtitle: 'Lexus Encore owner benefits included', footer: 'Lexus dealer backed & verified' },
  mazda: { name: 'Mazda', accent: '#101820', accentText: '#ffffff', title: 'Mazda Warranty Still Applies', subtitle: 'Fitted with a genuine Mazda accessories & Apple CarPlay', footer: 'Workshop inspected & verified' },
  hyundai: { name: 'Hyundai', accent: '#002c5f', accentText: '#ffffff', title: 'Balance of Hyundai Warranty Applies', subtitle: 'Apple CarPlay & Android Auto · Hyundai SmartSense', footer: 'Dealership backed, inspected & verified' },
  kia: { name: 'Kia', accent: '#05141f', accentText: '#ffffff', title: 'Balance of 7-Year Kia Warranty', subtitle: 'Capped price servicing available', footer: 'Workshop inspected & verified' },
  subaru: { name: 'Subaru', accent: '#0033a0', accentText: '#ffffff', title: 'Balance of Subaru Warranty Applies', subtitle: 'Wireless Apple CarPlay & Android Auto', footer: 'Dealership backed, inspected & verified' },
  nissan: { name: 'Nissan', accent: '#c3002f', accentText: '#ffffff', title: 'Balance of Nissan Warranty Applies', subtitle: 'Including Roadside Assistance · Nissan dealer backed', footer: 'Full Nissan service history' },
  mg: { name: 'MG', accent: '#d0102f', accentText: '#ffffff', title: 'Still Covered by MG Warranty', subtitle: 'Workshop inspected, tested & verified', footer: 'Dealer backed & verified' },
  ford: { name: 'Ford', accent: '#00274e', accentText: '#ffffff', title: 'Balance of Ford Warranty Applies', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
  mitsubishi: { name: 'Mitsubishi', accent: '#e60012', accentText: '#ffffff', title: 'Balance of Mitsubishi Diamond Warranty', subtitle: 'Capped price servicing available', footer: 'Dealer backed & verified' },
  volkswagen: { name: 'Volkswagen', accent: '#001e50', accentText: '#ffffff', title: 'Balance of Volkswagen Warranty', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
  suzuki: { name: 'Suzuki', accent: '#e10a1c', accentText: '#ffffff', title: 'Balance of Suzuki Warranty', subtitle: 'Dealer backed, inspected & verified', footer: 'Dealer backed & verified' },
  isuzu: { name: 'Isuzu', accent: '#c8102e', accentText: '#ffffff', title: 'Balance of Isuzu UTE Warranty', subtitle: '6-year / 150,000 km warranty', footer: 'Dealer backed & verified' },
  gwm: { name: 'GWM', accent: '#b1060f', accentText: '#ffffff', title: 'Balance of GWM Warranty', subtitle: '7-year unlimited km warranty', footer: 'Dealer backed & verified' },
  ldv: { name: 'LDV', accent: '#0a2a6b', accentText: '#ffffff', title: 'Balance of LDV Warranty', subtitle: 'Dealer backed, inspected & verified', footer: 'Dealer backed & verified' },
  bmw: { name: 'BMW', accent: '#0166b1', accentText: '#ffffff', title: 'Balance of BMW Warranty', subtitle: 'BMW ConnectedDrive services included', footer: 'Dealer backed & verified' },
  mercedes: { name: 'Mercedes-Benz', accent: '#111111', accentText: '#ffffff', title: 'Balance of Mercedes-Benz Warranty', subtitle: 'Mercedes me connect included', footer: 'Dealer backed & verified' },
  audi: { name: 'Audi', accent: '#bb0a30', accentText: '#ffffff', title: 'Balance of Audi Warranty', subtitle: 'Apple CarPlay & Android Auto', footer: 'Dealer backed & verified' },
  tesla: { name: 'Tesla', accent: '#171a20', accentText: '#ffffff', title: 'Balance of Tesla Warranty', subtitle: 'Over-the-air updates & Supercharging ready', footer: 'Dealer backed & verified' },
};

export const BRAND_KEYS = Object.keys(BRANDS);

/**
 * Resolve a detected make (any casing / punctuation) to a full brand style.
 * Returns null for "unknown" — the caller then skips the branded tag, which is
 * exactly the behaviour the client asked for when the logo is not clear.
 *
 * @param {string} make
 * @returns {{key:string,name:string,accent:string,accentText:string,title:string,subtitle:string,footer:string}|null}
 */
export function resolveBrand(make) {
  if (!make) return null;
  const k = String(make).toLowerCase().replace(/[^a-z]/g, '');
  if (!k || k === 'unknown' || k === 'none') return null;

  if (BRANDS[k]) return { key: k, ...BRANDS[k] };

  // Tolerate common variants the detector might return.
  const aliases = {
    mercedesbenz: 'mercedes',
    benz: 'mercedes',
    vw: 'volkswagen',
    chevrolet: 'generic',
    holden: 'generic',
    greatwall: 'gwm',
    haval: 'gwm',
  };
  if (aliases[k]) {
    const target = aliases[k];
    return target === 'generic'
      ? { ...GENERIC, name: titleCase(make) }
      : { key: target, ...BRANDS[target] };
  }

  // Identified as a real make we simply do not have styling for → generic band,
  // still named after the maker so the tag is truthful.
  return { ...GENERIC, key: 'generic', name: titleCase(make) };
}

function titleCase(s) {
  return String(s)
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default { BRANDS, BRAND_KEYS, resolveBrand };
