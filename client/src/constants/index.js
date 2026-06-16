export const APP_NAME = 'AutoVision GPT';
export const APP_TAGLINE = 'Dealership-grade vehicle photos, automatically.';

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_MB = 25;

/** Steps shown in the loading overlay to communicate the pipeline. */
export const PIPELINE_STEPS = [
  'Analysing the vehicle',
  'Removing the original background',
  'Placing it into your scene',
  'Matching lighting & perspective',
  'Generating realistic shadows',
  'Polishing to dealership quality',
];
