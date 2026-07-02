import fs from 'node:fs/promises';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { normaliseInput, describe, fromBase64, resizeTo } from '../services/image.service.js';
import { enhanceVehicleImage } from '../services/openai.service.js';
import { resolveBackgroundPath } from '../services/backgrounds.service.js';
import { FRAMING_LEVELS, DEFAULT_FRAMING } from '../prompts/vehicleEnhancement.prompt.js';
import { resolveFormat } from '../config/formats.js';

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

  // Optional controls (validated, with safe defaults).
  const framing = FRAMING_LEVELS.includes(req.body?.framing) ? req.body.framing : DEFAULT_FRAMING;
  const { key: format, preset } = resolveFormat(req.body?.format);

  // Optional paint colour change.
  const colorName = typeof req.body?.colorName === 'string' ? req.body.colorName.trim() : '';
  let colorHex = typeof req.body?.colorHex === 'string' ? req.body.colorHex.trim() : '';
  if (colorHex && !/^#?[0-9a-fA-F]{6}$/.test(colorHex)) colorHex = '';
  if (colorHex && !colorHex.startsWith('#')) colorHex = `#${colorHex}`;

  // Background handling: 'keep' | 'studio' | 'replace'. A provided file/preset ⇒ replace.
  const backgroundModeReq = req.body?.backgroundMode === 'keep' ? 'keep' : 'studio';
  const backgroundId = typeof req.body?.backgroundId === 'string' ? req.body.backgroundId.trim() : '';
  let backgroundRaw = backgroundFile?.buffer || null;
  let backgroundSource = backgroundFile ? 'upload' : backgroundModeReq;
  if (!backgroundRaw && backgroundId) {
    const presetPath = resolveBackgroundPath(backgroundId);
    if (!presetPath) throw ApiError.badRequest(`Selected background not found: ${backgroundId}`);
    backgroundRaw = await fs.readFile(presetPath);
    backgroundSource = `preset:${backgroundId}`;
  }

  const startedAt = Date.now();

  // Normalise inputs (auto-rotate, downscale, PNG) before sending to the model.
  const [vehicleBuffer, backgroundBuffer] = await Promise.all([
    normaliseInput(vehicleFile.buffer),
    backgroundRaw ? normaliseInput(backgroundRaw) : Promise.resolve(null),
  ]);

  const meta = await describe(vehicleBuffer);
  logger.info(
    `Enhance request — vehicle ${meta.width}x${meta.height}, background=${backgroundSource}, framing=${framing}, colour=${colorName || 'none'}, format=${format || 'default'}`
  );

  const result = await enhanceVehicleImage({
    vehicleBuffer,
    backgroundBuffer,
    mode: backgroundModeReq,
    notes,
    framing,
    colorName,
    colorHex,
    size: preset.genSize,
  });

  // Deliver the platform-exact size when the preset requires it (e.g. Carsales 1280x853).
  let finalB64 = result.b64;
  let finalSize = result.size;
  if (preset.out) {
    const resized = await resizeTo(fromBase64(result.b64), preset.out.w, preset.out.h);
    finalB64 = resized.toString('base64');
    finalSize = `${preset.out.w}x${preset.out.h}`;
  }

  const elapsedMs = Date.now() - startedAt;
  logger.success(`Enhancement complete in ${elapsedMs}ms (delivered ${finalSize})`);

  res.json({
    success: true,
    data: {
      image: `data:image/png;base64,${finalB64}`,
      meta: {
        model: result.model,
        generatedSize: result.size,
        size: finalSize,
        format,
        quality: result.quality,
        usedBackground: result.usedBackground,
        mode: result.mode,
        framing: result.framing,
        colorName: result.colorName,
        colorHex: result.colorHex,
        elapsedMs,
      },
    },
  });
});

export default { enhance };
