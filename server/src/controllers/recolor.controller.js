import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { normaliseInput, describe, fromBase64, resizeTo } from '../services/image.service.js';
import { recolorVehicleImage } from '../services/openai.service.js';
import { resolveFormat } from '../config/formats.js';

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

/**
 * POST /api/recolor
 * multipart/form-data:
 *   - vehicle   (file, required) — the finished template image
 *   - colorName (text, required) — e.g. "Gloss Black"
 *   - colorHex  (text, optional) — e.g. "#0C0C0E"
 *   - format    (text, optional) — carsales | landscape | square | portrait
 *   - notes     (text, optional)
 *
 * Returns the recoloured image as a base64 data URL plus metadata.
 */
export const recolor = asyncHandler(async (req, res) => {
  const vehicleFile = req.files?.vehicle?.[0];
  if (!vehicleFile) {
    throw ApiError.badRequest('A "vehicle" (template) image file is required.');
  }

  const colorName = typeof req.body?.colorName === 'string' ? req.body.colorName.trim() : '';
  if (!colorName) {
    throw ApiError.badRequest('A "colorName" is required (e.g. "Gloss Black").');
  }

  let colorHex = typeof req.body?.colorHex === 'string' ? req.body.colorHex.trim() : '';
  if (colorHex && !HEX_RE.test(colorHex)) {
    throw ApiError.badRequest('"colorHex" must be a 6-digit hex colour, e.g. "#0C0C0E".');
  }
  if (colorHex && !colorHex.startsWith('#')) colorHex = `#${colorHex}`;

  const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';
  const { key: format, preset } = resolveFormat(req.body?.format);

  const startedAt = Date.now();

  const vehicleBuffer = await normaliseInput(vehicleFile.buffer);
  const meta = await describe(vehicleBuffer);
  logger.info(`Recolor request — template ${meta.width}x${meta.height} → ${colorName}, format=${format}`);

  const result = await recolorVehicleImage({
    vehicleBuffer,
    colorName,
    colorHex,
    notes,
    size: preset.genSize,
  });

  // Deliver platform-exact size when required (e.g. Carsales 1280x853).
  let finalB64 = result.b64;
  let finalSize = result.size;
  if (preset.out) {
    const resized = await resizeTo(fromBase64(result.b64), preset.out.w, preset.out.h);
    finalB64 = resized.toString('base64');
    finalSize = `${preset.out.w}x${preset.out.h}`;
  }

  const elapsedMs = Date.now() - startedAt;
  logger.success(`Recolour → ${colorName} complete in ${elapsedMs}ms (delivered ${finalSize})`);

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
        colorName: result.colorName,
        colorHex: result.colorHex,
        elapsedMs,
      },
    },
  });
});

export default { recolor };
