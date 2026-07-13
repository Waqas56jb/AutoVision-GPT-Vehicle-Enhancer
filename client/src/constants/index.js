export const APP_NAME = 'AutoVision GPT';
export const APP_TAGLINE = 'Dealership-grade vehicle photos, automatically.';

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_MB = 25;

/**
 * How many images to render at the same time.
 *
 * The wall-clock time for a batch is roughly `ceil(jobs / CONCURRENCY) × ~60s`,
 * so this is the single biggest lever on how long a batch takes. The real
 * ceiling is NOT this app — it is your OpenAI account's images-per-minute limit
 * for gpt-image-1 (see platform.openai.com → Settings → Limits). Set this at or
 * just below that limit: too high and every extra request comes straight back
 * as a 429.
 *
 * Override per-environment with VITE_BATCH_CONCURRENCY.
 */
export const BATCH_CONCURRENCY = Math.max(
  1,
  Number(import.meta.env.VITE_BATCH_CONCURRENCY) || 6
);

/** A 429 means we are pushing harder than the account allows — retry, don't fail. */
export const MAX_ATTEMPTS = 4;

/** How much of the frame the vehicle should fill (sent to the backend). */
export const FRAMING_OPTIONS = [
  { value: 'standard', label: 'Standard', hint: 'Car ~75% of frame' },
  { value: 'large', label: 'Large', hint: 'Car ~82% (recommended)' },
  { value: 'hero', label: 'Hero', hint: 'Tight crop, car ~90%' },
];
export const DEFAULT_FRAMING = 'large';

/** Output aspect ratio / placement target. */
export const FORMAT_OPTIONS = [
  { value: 'carsales', label: 'Carsales', hint: '1280×853 · main' },
  { value: 'landscape', label: 'Landscape', hint: '1536×1024 · Web/FB' },
  { value: 'square', label: 'Square', hint: '1024² · Instagram' },
  { value: 'portrait', label: 'Portrait', hint: '1024×1536 · Stories' },
];
export const DEFAULT_FORMAT = 'carsales';

/**
 * Vehicle paint colours for the Colour Change mode.
 * PRIMARY = the 5 colours the client uses (MG4 range). MORE = extra presets
 * revealed by the "More colours" button. Users can also add a custom colour.
 */
export const PRIMARY_COLORS = [
  { key: 'white', name: 'Pearl White', hex: '#EDEDEB' },
  { key: 'black', name: 'Gloss Black', hex: '#0C0C0E' },
  { key: 'blue', name: 'Vivid Blue', hex: '#1763C8' },
  { key: 'silver', name: 'Metallic Silver', hex: '#B9BDC1' },
  { key: 'red', name: 'Flame Red', hex: '#C42B26' },
];

export const MORE_COLORS = [
  { key: 'grey', name: 'Gunmetal Grey', hex: '#5A5E63' },
  { key: 'green', name: 'British Racing Green', hex: '#25402E' },
  { key: 'orange', name: 'Sunset Orange', hex: '#E76A1E' },
  { key: 'yellow', name: 'Racing Yellow', hex: '#F4C20D' },
  { key: 'bronze', name: 'Khaki Bronze', hex: '#8C7B57' },
];

/** Steps shown in the loading overlay to communicate the pipeline. */
export const PIPELINE_STEPS = [
  'Analysing the vehicle',
  'Removing the original background',
  'Placing it into your scene',
  'Matching lighting & perspective',
  'Generating realistic shadows',
  'Polishing to dealership quality',
];
