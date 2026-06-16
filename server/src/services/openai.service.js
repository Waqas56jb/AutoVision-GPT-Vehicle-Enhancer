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
 * @returns {Promise<{ b64: string, model: string, size: string, quality: string, usedBackground: boolean }>}
 */
export async function enhanceVehicleImage({ vehicleBuffer, backgroundBuffer, notes }) {
  const usedBackground = Boolean(backgroundBuffer);

  const prompt = usedBackground
    ? buildVehicleEnhancementPrompt({ notes })
    : buildStudioEnhancementPrompt({ notes });

  // Order matters: [0] vehicle, [1] background (the prompt references this order).
  const imageFiles = [
    await toFile(vehicleBuffer, 'vehicle.png', { type: 'image/png' }),
  ];
  if (usedBackground) {
    imageFiles.push(await toFile(backgroundBuffer, 'background.png', { type: 'image/png' }));
  }

  logger.info(
    `Requesting ${config.openai.imageModel} edit ` +
      `(size=${config.openai.imageSize}, quality=${config.openai.imageQuality}, background=${usedBackground})`
  );

  let response;
  try {
    response = await openai.images.edit({
      model: config.openai.imageModel,
      image: imageFiles,
      prompt,
      size: config.openai.imageSize,
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
    size: config.openai.imageSize,
    quality: config.openai.imageQuality,
    usedBackground,
  };
}

export default { enhanceVehicleImage };
