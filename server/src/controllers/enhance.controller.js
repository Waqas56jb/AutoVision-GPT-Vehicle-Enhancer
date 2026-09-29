import fs from 'node:fs/promises';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { normaliseInput, describe, fromBase64, resizeTo } from '../services/image.service.js';
import { enhanceVehicleImage } from '../services/openai.service.js';
import { autoFrameToFill, measureCarBox } from '../services/autoFrame.service.js';
import { detectVehicleBox } from '../services/vehicleDetect.service.js';
import { detectBrand } from '../services/brandDetect.service.js';
import { applyMarketingTag } from '../services/overlay.service.js';
import { resolveBackgroundPath } from '../services/backgrounds.service.js';
import { FRAMING_LEVELS, DEFAULT_FRAMING, FRAMING_FILL } from '../prompts/vehicleEnhancement.prompt.js';
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

  // Optional marketing warranty tag: 'none' | 'corner' | 'footer' | 'headerFooter'.
  // Legacy 'banner' is accepted as headerFooter only — never as footer.
  const rawTag = req.body?.tagStyle;
  const tagStyle =
    rawTag === 'banner'
      ? 'headerFooter'
      : ['corner', 'footer', 'headerFooter'].includes(rawTag)
        ? rawTag
        : 'none';
  const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');
  const tagTitle = clip(req.body?.tagTitle, 60);
  const tagSubtitle = clip(req.body?.tagSubtitle, 90);
  const tagFooter = clip(req.body?.tagFooter, 60);

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

  // Final delivery size: the platform-exact size when required (Carsales
  // 1280x853), otherwise the native generated size.
  const [genW, genH] = result.size.split('x').map(Number);
  const outW = preset.out?.w || genW;
  const outH = preset.out?.h || genH;

  const genBuf = fromBase64(result.b64);
  let finalBuf;
  let framedApplied = false;
  let framedFill = null;
  const skipped = Boolean(result.skipped) || result.shotType === 'skip';
  const passthrough =
    Boolean(result.passthrough) || skipped || result.shotType === 'detail';

  if (passthrough) {
    // skip: not a vehicle. detail: real part, but no images.edit (glyphs stay original).
    finalBuf = genBuf;
  } else if (result.shotType === 'exterior') {
    /* The car's size is GUARANTEED here, not left to the model. We measure where
       the car landed in the render and crop-zoom it to the target fill. This is
       the fix for the client's repeated "car is too small / even hero too small"
       — the model's own framing was landing at ~60–75% regardless of the prompt.
       On any low-confidence measurement it safely falls back to a plain resize. */
    const fill = FRAMING_FILL[framing] || FRAMING_FILL[DEFAULT_FRAMING];
    const box = await detectVehicleBox(genBuf);
    const framed = await autoFrameToFill(genBuf, { fillWidth: fill, outW, outH, box });
    finalBuf = framed.buffer;
    framedApplied = framed.applied;
    framedFill = framed.fill;
  } else {
    // Interior shots must NOT be zoomed — the whole frame is the subject.
    finalBuf = await resizeTo(genBuf, outW, outH);
  }

  /* Marketing warranty tag (optional). Only on exterior shots, and only when the
     make can actually be read from the car — a wrong maker's name on a listing is
     worse than none, so an unclear badge means no tag (the client's rule).
     Corner stays a compact card even if both top corners are tight; it never
     converts into a full-width banner. Footer is bottom-bar only. Header+footer
     is only when the operator picks headerFooter. */
  let tagMeta = null;
  if (tagStyle !== 'none' && result.shotType === 'exterior') {
    const { brand, make, logoClear } = await detectBrand(vehicleBuffer);
    if (brand) {
      const carBox = await measureCarBox(finalBuf).catch(() => null);
      const tagged = await applyMarketingTag(finalBuf, {
        style: tagStyle,
        brand,
        title: tagTitle,
        subtitle: tagSubtitle,
        footer: tagFooter,
        carBox,
      });
      finalBuf = tagged.buffer;
      tagMeta = { brand: brand.name, style: tagStyle, placement: tagged.placement };
    } else {
      tagMeta = { brand: null, skipped: true, reason: `make "${make}" not clearly visible`, logoClear };
    }
  }

  const finalB64 = finalBuf.toString('base64');
  const delivered = passthrough ? await describe(finalBuf) : { width: outW, height: outH };
  const finalSize = `${delivered.width}x${delivered.height}`;

  const elapsedMs = Date.now() - startedAt;
  logger.success(`Enhancement complete in ${elapsedMs}ms (delivered ${finalSize})`);

  res.json({
    success: true,
    data: {
      image: `data:image/png;base64,${finalB64}`,
      meta: {
        model: result.model,
        // Which brief ran: exterior / interior / detail / skip.
        shotType: result.shotType,
        skipped,
        passthrough,
        generatedSize: result.size,
        size: finalSize,
        format,
        quality: result.quality,
        usedBackground: result.usedBackground,
        mode: result.mode,
        framing: result.framing,
        // How the car ended up sized: whether the deterministic auto-frame ran,
        // and the car's final width as a fraction of the frame.
        autoFramed: framedApplied,
        fill: framedFill,
        // Marketing tag outcome (null when none requested).
        tag: tagMeta,
        colorName: result.colorName,
        colorHex: result.colorHex,
        elapsedMs,
      },
    },
  });
});

export default { enhance };
