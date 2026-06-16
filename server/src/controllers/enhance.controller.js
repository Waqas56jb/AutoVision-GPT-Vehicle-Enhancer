import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { normaliseInput, describe } from '../services/image.service.js';
import { enhanceVehicleImage } from '../services/openai.service.js';

/**
 * POST /api/enhance
 * multipart/form-data:
 *   - vehicle    (file, required)
 *   - background (file, optional)
 *   - notes      (text, optional)
 *
 * Returns the enhanced image as a base64 data URL plus metadata.
 */
export const enhance = asyncHandler(async (req, res) => {
  const vehicleFile = req.files?.vehicle?.[0];
  const backgroundFile = req.files?.background?.[0];
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';

  if (!vehicleFile) {
    throw ApiError.badRequest('A "vehicle" image file is required.');
  }

  const startedAt = Date.now();

  // Normalise inputs (auto-rotate, downscale, PNG) before sending to the model.
  const [vehicleBuffer, backgroundBuffer] = await Promise.all([
    normaliseInput(vehicleFile.buffer),
    backgroundFile ? normaliseInput(backgroundFile.buffer) : Promise.resolve(null),
  ]);

  const meta = await describe(vehicleBuffer);
  logger.info(`Enhance request — vehicle ${meta.width}x${meta.height}, background=${Boolean(backgroundFile)}`);

  const result = await enhanceVehicleImage({ vehicleBuffer, backgroundBuffer, notes });

  const elapsedMs = Date.now() - startedAt;
  logger.success(`Enhancement complete in ${elapsedMs}ms`);

  res.json({
    success: true,
    data: {
      image: `data:image/png;base64,${result.b64}`,
      meta: {
        model: result.model,
        size: result.size,
        quality: result.quality,
        usedBackground: result.usedBackground,
        elapsedMs,
      },
    },
  });
});

export default { enhance };
