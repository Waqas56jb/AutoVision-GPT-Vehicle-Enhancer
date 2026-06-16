import { toFile } from 'openai';
import openai from '../config/openai.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import {
  buildVehicleEnhancementPrompt,
  buildStudioEnhancementPrompt,
} from '../prompts/vehicleEnhancement.prompt.js';

/**
 * Core AI pipeline. Sends the vehicle (and optional background) image(s) to
 * gpt-image-1's edit endpoint with the engineered prompt and returns the
 * resulting image as a base64 PNG.
 *
 * @param {object} params
 * @param {Buffer} params.vehicleBuffer   - normalised vehicle image (PNG)
 * @param {Buffer|null} params.backgroundBuffer - normalised background image (PNG) or null
 * @param {string} [params.notes]         - optional dealer instructions
 * @param {string} [params.framing]       - 'standard' | 'large' | 'hero'
 * @param {string} [params.size]          - output size override (e.g. '1536x1024')
 * @returns {Promise<{ b64: string, model: string, size: string, quality: string, usedBackground: boolean, framing: string }>}
 */
export async function enhanceVehicleImage({ vehicleBuffer, backgroundBuffer, notes, framing, size }) {
  const usedBackground = Boolean(backgroundBuffer);
  const outputSize = size || config.openai.imageSize;

  const prompt = usedBackground
    ? buildVehicleEnhancementPrompt({ notes, framing })
    : buildStudioEnhancementPrompt({ notes, framing });

  // Order matters: [0] vehicle, [1] background (the prompt references this order).
  const imageFiles = [
    await toFile(vehicleBuffer, 'vehicle.png', { type: 'image/png' }),
  ];
  if (usedBackground) {
    imageFiles.push(await toFile(backgroundBuffer, 'background.png', { type: 'image/png' }));
  }

  logger.info(
    `Requesting ${config.openai.imageModel} edit ` +
      `(size=${outputSize}, quality=${config.openai.imageQuality}, framing=${framing || 'default'}, background=${usedBackground})`
  );

  let response;
  try {
    response = await openai.images.edit({
      model: config.openai.imageModel,
      image: imageFiles,
      prompt,
      size: outputSize,
      quality: config.openai.imageQuality,
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
    throw ApiError.upstream('Image enhancement provider error.', err?.message);
  }

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) {
    throw ApiError.upstream('OpenAI returned no image data.');
  }

  return {
    b64,
    model: config.openai.imageModel,
    size: outputSize,
    quality: config.openai.imageQuality,
    usedBackground,
    framing: framing || 'default',
  };
}

export default { enhanceVehicleImage };
