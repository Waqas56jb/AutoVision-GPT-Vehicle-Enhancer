export const APP_NAME = 'AutoVision GPT';
export const APP_TAGLINE = 'Dealership-grade vehicle photos, automatically.';

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_MB = 25;

/** How much of the frame the vehicle should fill (sent to the backend). */
export const FRAMING_OPTIONS = [
  { value: 'standard', label: 'Standard', hint: 'Car ~75% of frame' },
  { value: 'large', label: 'Large', hint: 'Car ~82% (recommended)' },
  { value: 'hero', label: 'Hero', hint: 'Tight crop, car ~90%' },
];
export const DEFAULT_FRAMING = 'large';

/** Output aspect ratio / placement target. */
export const FORMAT_OPTIONS = [
  { value: 'landscape', label: 'Landscape', hint: 'Carsales · Web · FB' },
  { value: 'square', label: 'Square', hint: 'Instagram · Marketplace' },
  { value: 'portrait', label: 'Portrait', hint: 'Stories · Vertical' },
];
export const DEFAULT_FORMAT = 'landscape';

/** Steps shown in the loading overlay to communicate the pipeline. */
export const PIPELINE_STEPS = [
  'Analysing the vehicle',
  'Removing the original background',
  'Placing it into your scene',
  'Matching lighting & perspective',
  'Generating realistic shadows',
  'Polishing to dealership quality',
];
