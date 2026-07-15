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

const PROMPT = `You are sorting photos from a car dealership's listing.

Reply with EXACTLY ONE word:

exterior — the whole vehicle (or nearly all of it) is visible from outside: shot in a street, driveway, car park or showroom. The complete car body is the subject.
interior — a view from inside the cabin: dashboard, seats, boot/cargo area, footwell, or a wide view of the cabin.
detail   — a close-up of ONE PART of the car: a wheel, a badge or lettering, a headlight, a mirror, a door handle, a button, a switch, a screen, a gear selector, a steering wheel.

If you cannot see the whole car body, it is NOT exterior.`;

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
