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
 *   interior — dashboard, seats, boot. Keep the cabin; only REAL windows change.
 *   detail   — a wheel, a badge, a screen close-up. Clean up only.
 *   skip     — NOT a vehicle photo (empty showroom, cartoon, random object).
 *              Do not run gpt-image-1. Return the original.
 *
 * skip is a hard precondition: no vehicle evidence in IMAGE 1 means no edit.
 * Classifier failure also skips — compositing a non-car as a car is worse than
 * leaving it alone.
 *
 * Tests (physical subject of IMAGE 1, not what a screen displays):
 *   empty showroom / lobby, no vehicle          → skip
 *   chibi robot on black, no vehicle hardware   → skip
 *   real Kia centre-stack / infotainment bezel  → detail
 *     (even if the LED shows that same robot)
 */

export const SHOT_TYPES = ['exterior', 'interior', 'detail', 'skip'];
export const DEFAULT_SHOT = 'skip';

const PROMPT = `You are the shot-type classifier for AutoVision GPT.


BACKGROUND PLATE RULE:
If IMAGE 1 is an empty scene intended to be a background/showroom plate, return skip.
IMAGE 2 is allowed to be a background plate, but IMAGE 1 must independently contain the real vehicle before any vehicle editing is allowed.


REAL VEHICLE EVIDENCE:
Accept exterior/interior/detail only when actual physical vehicle evidence is visible, such as:
- real body panels
- real wheels/tires
- real mirrors
- real lights
- real grille
- real badges attached to a vehicle
- real doors
- real seats
- real dashboard
- real steering wheel
- real center console
- real physical buttons/knobs
- real infotainment hardware
- real instrument cluster
- real trim
- real vehicle window/door structure


EXTERIOR:
Use exterior when the real physical subject is primarily the outside of a vehicle.


INTERIOR:
Use interior when the real physical subject is a meaningful view of the vehicle cabin/interior, including actual dashboard, seats, steering wheel, console, door panels, pillars, or other physical cabin structure.


DETAIL:
Use detail when IMAGE 1 is a close-up of a REAL vehicle or REAL vehicle component.


A real infotainment/LED/display close-up is DETAIL even if the display content shows:
- a robot
- a cartoon
- grass
- parked cars
- a road
- a showroom/lobby
- a map
- any other image or video


The content displayed ON a real vehicle screen does not determine the shot type. The physical screen, bezel, buttons, knobs, and surrounding vehicle hardware do.


A cartoon/robot BY ITSELF is skip.
A cartoon/robot DISPLAYED ON REAL VEHICLE HARDWARE is detail.


DO NOT infer missing vehicle context.
DO NOT treat an empty room as a cabin.
DO NOT treat an illustration as a vehicle part.
DO NOT treat a background plate as an exterior listing photo.


Decision priority:
1. Is there real vehicle or real vehicle-part evidence?
2. If NO → skip.
3. If YES → classify exterior, interior, or detail based on the physical vehicle subject.


Return EXACTLY ONE WORD and nothing else:
exterior
interior
detail
skip`;

/**
 * @param {Buffer} imageBuffer  the vehicle photo as uploaded (normalised)
 * @returns {Promise<{type:string, source:'vision'|'fallback', reason:string}>}
 */
export async function detectShotType(imageBuffer) {
  try {
    const thumb = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const res = await openai.chat.completions.create({
      model: config.openai.visionModel,
      max_tokens: 8,
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

    const raw = (res.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const compact = raw.replace(/[^a-z]/g, '');
    const type = SHOT_TYPES.find((t) => compact === t || compact.startsWith(t));

    if (!type) {
      logger.warn(`Shot classifier returned "${raw}" — skipping (not treating as a car).`);
      return { type: DEFAULT_SHOT, source: 'fallback', reason: `unrecognised answer "${raw}"` };
    }
    return { type, source: 'vision', reason: `classified as ${type}` };
  } catch (err) {
    logger.warn(`Shot classifier unavailable (${err?.message}) — skipping rather than inventing a car.`);
    return { type: DEFAULT_SHOT, source: 'fallback', reason: err?.message || 'classifier failed' };
  }
}

export default { detectShotType, SHOT_TYPES, DEFAULT_SHOT };
