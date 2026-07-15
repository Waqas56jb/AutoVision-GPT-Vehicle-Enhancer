import { toFile } from 'openai';
import openai from '../config/openai.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import {
  buildVehicleEnhancementPrompt,
  buildStudioEnhancementPrompt,
  buildKeepBackgroundPrompt,
  buildInteriorPrompt,
  buildDetailPrompt,
} from '../prompts/vehicleEnhancement.prompt.js';
import { buildRecolorPrompt } from '../prompts/recolor.prompt.js';
import { detectShotType } from './shotType.service.js';

/**
 * Low-level wrapper around the gpt-image-1 edit endpoint with consistent error
 * translation. Returns the base64 PNG of the first image.
 *
 * @param {object} params
 * @param {import('openai').Uploadable[]} params.imageFiles
 * @param {string} params.prompt
 * @param {string} params.size
 * @returns {Promise<string>} base64 PNG
 */
async function runImageEdit({ imageFiles, prompt, size }) {
  let response;
  try {
    response = await openai.images.edit({
      model: config.openai.imageModel,
      image: imageFiles,
      prompt,
      size,
      quality: config.openai.imageQuality,
      /**
       * THE fix for "it changed their headlights and the whole model of the car".
       *
       * input_fidelity tells the model how hard to work at reproducing the
       * FEATURES of the input images rather than re-imagining them — and it
       * DEFAULTS TO 'low'. Every image this app has ever produced was generated
       * with the model free to redraw the car from memory, which is exactly what
       * it did. No amount of prompt wording overrides a low-fidelity default.
       *
       * Supported on gpt-image-1 and later (not on gpt-image-1-mini).
       */
      input_fidelity: config.openai.inputFidelity,
      n: 1,
    });
  } catch (err) {
    logger.error('OpenAI image edit failed:', err?.message || err);
    const status = err?.status;
    if (status === 401) throw ApiError.upstream('OpenAI authentication failed — check OPENAI_API_KEY.');
    if (status === 429) throw ApiError.tooManyRequests('OpenAI rate limit / quota exceeded. Try again shortly.');
    if (status === 400) {
      throw ApiError.badRequest(
        'OpenAI rejected the request. The image may be unsupported or the content was blocked.',
        err?.error?.message
      );
    }
    throw ApiError.upstream('Image provider error.', err?.message);
  }

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) throw ApiError.upstream('OpenAI returned no image data.');
  return b64;
}

/**
 * Core AI pipeline. Sends the vehicle (and optional background) image(s) to
 * gpt-image-1's edit endpoint with the engineered prompt and returns the
 * resulting image as a base64 PNG.
 *
 * @param {object} params
 * @param {Buffer} params.vehicleBuffer   - normalised vehicle image (PNG)
 * @param {Buffer|null} params.backgroundBuffer - normalised background image (PNG) or null
 * @param {'replace'|'studio'|'keep'} [params.mode] - background handling mode
 * @param {string} [params.notes]         - optional dealer instructions
 * @param {string} [params.framing]       - 'standard' | 'large' | 'hero'
 * @param {string} [params.colorName]     - optional target paint colour
 * @param {string} [params.colorHex]      - optional hex hint
 * @param {string} [params.size]          - output size override (e.g. '1536x1024')
 * @returns {Promise<object>}
 */
export async function enhanceVehicleImage({
  vehicleBuffer,
  backgroundBuffer,
  mode,
  notes,
  framing,
  colorName,
  colorHex,
  size,
}) {
  const usedBackground = Boolean(backgroundBuffer);
  const outputSize = size || config.openai.imageSize;
  // Resolve the effective mode: a supplied background always means "replace".
  const effectiveMode = usedBackground ? 'replace' : mode === 'keep' ? 'keep' : 'studio';

  /* Which KIND of photo is this? A dealer listing is mostly interior and detail
     shots — running the exterior prompt over a dashboard is how you end up with
     a steering wheel parked on a showroom floor. One cheap vision call picks the
     right brief. Falls back to 'exterior' (the old behaviour) if it can't tell. */
  const shot = await detectShotType(vehicleBuffer);

  let prompt;
  if (shot.type === 'interior') {
    prompt = buildInteriorPrompt({ notes, hasBackground: usedBackground });
  } else if (shot.type === 'detail') {
    prompt = buildDetailPrompt({ notes });
  } else if (effectiveMode === 'replace') {
    prompt = buildVehicleEnhancementPrompt({ notes, framing, colorName, colorHex });
  } else if (effectiveMode === 'keep') {
    prompt = buildKeepBackgroundPrompt({ notes, colorName, colorHex });
  } else {
    prompt = buildStudioEnhancementPrompt({ notes, framing, colorName, colorHex });
  }

  /* A detail close-up has no background to composite, so sending one only invites
     the model to paste a showroom behind a wheel nut. */
  const sendBackground = usedBackground && shot.type !== 'detail';

  // Order matters: [0] vehicle, [1] background (the prompt references this order).
  const imageFiles = [await toFile(vehicleBuffer, 'vehicle.png', { type: 'image/png' })];
  if (sendBackground) {
    imageFiles.push(await toFile(backgroundBuffer, 'background.png', { type: 'image/png' }));
  }

  logger.info(
    `Requesting ${config.openai.imageModel} enhance — shot=${shot.type} (${shot.source}), ` +
      `mode=${effectiveMode}, fidelity=${config.openai.inputFidelity}, size=${outputSize}, ` +
      `quality=${config.openai.imageQuality}, framing=${framing || 'default'}, colour=${colorName || 'none'}`
  );

  const b64 = await runImageEdit({ imageFiles, prompt, size: outputSize });

  return {
    b64,
    shotType: shot.type,
    model: config.openai.imageModel,
    size: outputSize,
    quality: config.openai.imageQuality,
    usedBackground,
    mode: effectiveMode,
    framing: framing || 'default',
    colorName: colorName || null,
    colorHex: colorHex || null,
  };
}

/**
 * Recolour pipeline. Takes a finished template image and changes ONLY the car's
 * paint colour, preserving the background, pose, framing, shadows and trim.
 *
 * @param {object} params
 * @param {Buffer} params.vehicleBuffer - normalised template image (PNG)
 * @param {string} params.colorName     - target colour name, e.g. "Gloss Black"
 * @param {string} [params.colorHex]    - optional hex hint, e.g. "#0C0C0E"
 * @param {string} [params.notes]       - optional extra instructions
 * @param {string} [params.size]        - output size override
 * @returns {Promise<{ b64: string, model: string, size: string, quality: string, colorName: string, colorHex: string }>}
 */
export async function recolorVehicleImage({ vehicleBuffer, colorName, colorHex, notes, size }) {
  const outputSize = size || config.openai.imageSize;
  const prompt = buildRecolorPrompt({ colorName, colorHex, notes });

  const imageFiles = [await toFile(vehicleBuffer, 'template.png', { type: 'image/png' })];

  logger.info(
    `Requesting ${config.openai.imageModel} recolour → ${colorName}${colorHex ? ` (${colorHex})` : ''} (size=${outputSize})`
  );

  const b64 = await runImageEdit({ imageFiles, prompt, size: outputSize });

  return {
    b64,
    model: config.openai.imageModel,
    size: outputSize,
    quality: config.openai.imageQuality,
    colorName,
    colorHex: colorHex || null,
  };
}

export default { enhanceVehicleImage, recolorVehicleImage };
