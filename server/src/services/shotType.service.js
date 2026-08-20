import sharp from 'sharp';
import openai from '../config/openai.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Works out what kind of photo the dealer just uploaded, so the right prompt is
 * used. A listing is a mixed set — the client's own Lexus listing is roughly
 * three exterior shots and NINETEEN interior and detail shots — and one prompt
 * cannot serve all of them:
 *
 *   exterior — the whole car. Cut it out, drop it on the chosen background.
 *   interior — dashboard, seats, boot. Keep the cabin; only the view THROUGH the
 *              glass becomes the showroom. (This is what the client asked for:
 *              "when there is glass in the background, can we have the showroom
 *              that is showing?")
 *   detail   — a wheel, a badge, a headlight, a switch. There is no background to
 *              replace. Clean it up and change nothing else.
 *
 * Running the exterior prompt over a dashboard photo is how you get nonsense, so
 * this call is cheap insurance: a downscaled thumbnail, one word back, a fraction
 * of a cent. It never touches the delivered pixels — it only picks the prompt.
 *
 * If it fails for any reason we fall back to 'exterior', which is both the most
 * common case and the app's previous behaviour.
 */

export const SHOT_TYPES = ['exterior', 'interior', 'detail'];
export const DEFAULT_SHOT = 'exterior';

const PROMPT = `Classify IMAGE 1 as exactly one of: exterior, interior, detail.

IMPORTANT: classify by the PHYSICAL SUBJECT AND FRAMING, not by what is displayed inside a screen.

A DIGITAL DISPLAY IS NEVER A WINDOW.
A backup-camera feed, navigation map, radio/media UI, vehicle settings UI, warning message, parking-camera image, or any other image/video shown on an infotainment or instrument display is part of the VEHICLE HARDWARE and must NOT be interpreted as a real window or an opening to the outside.

Classify as DETAIL when IMAGE 1 is a tight crop focused on a specific vehicle component or feature, including:
- infotainment/display screen
- radio/media controls
- HVAC controls
- buttons, knobs, switches
- instrument cluster
- steering controls
- gear selector
- trim, badges, stitching, vents, handles, or other small vehicle details
- any close-up where the surrounding cabin is substantially outside the crop

A screen close-up remains DETAIL even when the screen itself shows an outdoor scene, parking lot, road, grass, buildings, or a camera feed.

Classify as INTERIOR only when IMAGE 1 actually shows a meaningful portion of the physical vehicle cabin/interior, such as seats, dashboard, steering wheel, cabin structure, door panels, pillars, or REAL vehicle windows.

A REAL WINDOW must be physically identifiable as a window/opening in the vehicle structure, with surrounding physical boundaries such as glass, frame, pillar, seal, trim, or door structure. A glowing rectangle, LCD/OLED display, infotainment screen, backup-camera display, or navigation display does NOT qualify.

If there is no real vehicle window visible in IMAGE 1, do not classify the image as having a window merely because a display contains an exterior scene.

Classify as EXTERIOR only when the physical subject is primarily the outside of the vehicle.

HARD RULE:
Preserve the actual framing when deciding the shot type. Do not infer missing cabin parts. If IMAGE 1 is a tight screen/control crop and contains no steering wheel, seats, windshield, side window, or wider dashboard, classify it as DETAIL.

Return only one word:
exterior
interior
detail`;

/**
 * @param {Buffer} imageBuffer  the vehicle photo as uploaded (normalised)
 * @returns {Promise<{type:string, source:'vision'|'fallback', reason:string}>}
 */
export async function detectShotType(imageBuffer) {
  try {
    // Downscale hard — the model only needs the gist, and this keeps it cheap.
    const thumb = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const res = await openai.chat.completions.create({
      model: config.openai.visionModel,
      max_tokens: 5,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${thumb.toString('base64')}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    });

    const word = (res.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const type = SHOT_TYPES.find((t) => word.startsWith(t));

    if (!type) {
      logger.warn(`Shot classifier returned "${word}" — defaulting to ${DEFAULT_SHOT}.`);
      return { type: DEFAULT_SHOT, source: 'fallback', reason: `unrecognised answer "${word}"` };
    }
    return { type, source: 'vision', reason: `classified as ${type}` };
  } catch (err) {
    logger.warn(`Shot classifier unavailable (${err?.message}) — defaulting to ${DEFAULT_SHOT}.`);
    return { type: DEFAULT_SHOT, source: 'fallback', reason: err?.message || 'classifier failed' };
  }
}

export default { detectShotType, SHOT_TYPES, DEFAULT_SHOT };
