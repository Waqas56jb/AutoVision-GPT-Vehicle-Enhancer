/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AutoVision GPT — Vehicle Recolour Prompt Engineering
 * ─────────────────────────────────────────────────────────────────────────────
 *  Use case: the dealer has ONE finished "template" advertising image (e.g. a
 *  white MG4 at 1280x853). They want the EXACT same image — same pose, same
 *  background, same framing, same lighting and shadows — with ONLY the car's
 *  paint colour changed (white → black / blue / silver / red / custom …).
 *
 *  The prompt is written to be maximally preservation-biased: everything stays
 *  identical except the painted body panels, which are repainted in the target
 *  colour with physically believable gloss, highlights and reflections.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Things that must remain pixel-faithful to the source template. */
const PRESERVE_RULES = `
PRESERVE EXACTLY — do NOT alter, move, redraw or re-render any of these:
- The entire BACKGROUND and scene (floor, walls, sky, surroundings) — keep it identical.
- The vehicle's make, model, body shape, proportions, position, camera angle, scale
  and the gaps/margins around it (same framing and composition as the source).
- Wheels, rims, tyres and brake calipers.
- All glass: windscreen, side and rear windows, sunroof, and whatever is visible
  through them (cabin, reflections).
- Headlights, tail-lights, indicators, fog lights and their lenses/housings.
- Grille, badges, emblems, manufacturer logos, number/licence plate and ALL text.
- Black/chrome trim, window surrounds, door handles, mirror glass, roof rails,
  lower bumper plastics, splitters and any non-painted body parts.
- The existing lighting direction, contact shadows and ground reflections.
`.trim();

/** How to repaint the body convincingly. */
const RECOLOR_RULES = (colorName, colorHex) => `
RECOLOUR — change ONLY the painted body panels to the new colour:
- Target colour: ${colorName}${colorHex ? ` (approximately ${colorHex})` : ''}.
- Apply it to the painted sheet-metal only: bonnet, front guards/fenders, doors,
  roof, quarter panels, boot/tailgate and the painted (body-coloured) bumper areas
  and door mirror caps if they were body-coloured in the source.
- Keep it photoreal automotive paint — correct gloss and a believable metallic/pearl
  sheen where appropriate. Re-render the highlights, reflections and shading in the
  NEW colour so they follow the SAME light direction and the SAME bright/dark pattern
  as the original (only the hue/finish changes; the form and lighting stay identical).
- Do NOT produce a flat, sticker-like or cartoonish fill. It must look like the car
  was genuinely manufactured and photographed in this colour.
- Do NOT tint the windows, tyres, background, shadows or trim with the new colour.
`.trim();

/**
 * Build the recolour prompt.
 * @param {object} params
 * @param {string} params.colorName - human colour name, e.g. "Gloss Black"
 * @param {string} [params.colorHex] - optional hex hint, e.g. "#0C0C0E"
 * @param {string} [params.notes] - optional extra dealer instructions
 * @returns {string}
 */
export function buildRecolorPrompt({ colorName, colorHex, notes } = {}) {
  const base = `
You are an expert automotive retoucher performing a precise, photorealistic
PAINT COLOUR CHANGE on a finished advertising image.

TASK: Reproduce the SAME image exactly, changing ONLY the car's body paint colour to
${colorName}. The result must be indistinguishable from a real photograph of the very
same vehicle, in the very same place and pose, that simply happens to be ${colorName}.

${PRESERVE_RULES}

${RECOLOR_RULES(colorName, colorHex)}

OUTPUT: the same scene and composition, same dimensions and framing, with only the
vehicle's paint colour changed to ${colorName}. Clean, dealership advertising quality.
`.trim();

  const dealerNotes = notes && notes.trim()
    ? `\n\nADDITIONAL INSTRUCTIONS (apply without breaking the rules above):\n${notes.trim()}`
    : '';

  return `${base}${dealerNotes}`;
}

export default buildRecolorPrompt;
