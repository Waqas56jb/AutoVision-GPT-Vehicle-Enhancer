import sharp from 'sharp';
import openai from '../config/openai.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { resolveBrand } from '../config/brands.js';

/**
 * Identifies the car's manufacturer from the photo, and — just as importantly —
 * whether its badge/logo is CLEARLY visible.
 *
 * The client's rule: only apply a branded warranty tag when the make can be read
 * from the car with confidence. If the logo is not clearly visible, we must not
 * guess a brand and stamp it on the advert — a wrong maker's name on a listing is
 * worse than no tag at all. So this returns { brand: null } whenever the model is
 * not sure, and the overlay step then skips the tag.
 *
 * Runs on a small thumbnail; a couple hundred tokens; a fraction of a cent.
 */

const PROMPT = `You are identifying the manufacturer of a car from a dealership photo, for a marketing badge.

Look ONLY at what is actually visible — the badge/emblem on the grille, bonnet or tailgate, the grille shape, and any model lettering.

Reply with a single line of JSON, nothing else:
{"make": "<manufacturer name, or unknown>", "logo_clear": <true|false>}

Rules:
- "make": the manufacturer only (e.g. Toyota, Honda, Mazda, Hyundai, Kia, Subaru, Nissan, MG, Ford, BMW). Not the model.
- Set "logo_clear" to true ONLY if you can actually see a badge or clear brand cue and are confident.
- If you cannot clearly see a badge, or you are guessing from body shape alone, set "make":"unknown" and "logo_clear":false.
- Never guess. When unsure, answer unknown.`;

/**
 * @param {Buffer} imageBuffer  the vehicle photo (original or enhanced — either works)
 * @returns {Promise<{brand:object|null, make:string, logoClear:boolean, source:string}>}
 *          brand is a resolved style object, or null when no tag should be applied.
 */
export async function detectBrand(imageBuffer) {
  try {
    const thumb = await sharp(imageBuffer)
      .resize(640, 640, { fit: 'inside' })
      .jpeg({ quality: 78 })
      .toBuffer();

    const res = await openai.chat.completions.create({
      model: config.openai.visionModel,
      max_tokens: 40,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${thumb.toString('base64')}`, detail: 'low' },
            },
          ],
        },
      ],
    });

    const raw = (res.choices?.[0]?.message?.content || '').trim();
    const parsed = safeParse(raw);
    const make = String(parsed.make || 'unknown');
    const logoClear = parsed.logo_clear === true;

    // The gate: a tag is only applied when the make is known AND clearly seen.
    const brand = logoClear ? resolveBrand(make) : null;

    logger.info(
      `Brand detect → make="${make}", logoClear=${logoClear} → ${brand ? `tag as ${brand.name}` : 'no tag (unclear)'}`
    );
    return { brand, make, logoClear, source: 'vision' };
  } catch (err) {
    // On any failure, apply no tag. Never stamp a guessed brand on a listing.
    logger.warn(`Brand detect unavailable (${err?.message}) — no tag applied.`);
    return { brand: null, make: 'unknown', logoClear: false, source: 'error' };
  }
}

function safeParse(s) {
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  } catch {
    return {};
  }
}

export default { detectBrand };
