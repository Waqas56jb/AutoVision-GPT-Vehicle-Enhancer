/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AutoVision GPT — Vehicle Enhancement Prompt Engineering
 * ─────────────────────────────────────────────────────────────────────────────
 *  This module produces the natural-language instruction that drives the
 *  gpt-image-1 edit/compositing call. The prompt is intentionally long,
 *  explicit and deterministic so that thousands of dealership images render
 *  with consistent, advertising-grade quality.
 *
 *  Image inputs passed to the model (order matters):
 *    [0] VEHICLE  — the photographer's raw shot (any location / lighting)
 *    [1] BACKGROUND — the destination scene the vehicle must be placed into
 *
 *  Design principle: describe the DESIRED FINAL RESULT and the HARD RULES,
 *  not a chain of editing software steps. Image models respond best to a
 *  precise description of the target image plus strict constraints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Non-negotiable rules that protect the integrity of the vehicle. */
const FIDELITY_RULES = `
ABSOLUTE FIDELITY RULES (must never be violated):
- The vehicle is the ONLY subject. Preserve it 100% accurately: exact body shape,
  proportions, panel lines, badges, grille pattern, headlight and taillight design,
  wheel/rim design, tyre profile, side mirrors, antenna and door handles.
- Do NOT change the car's make, model, model year, colour, trim or wheel design.
- Do NOT add, remove, redesign or "beautify" any part of the vehicle body.
- Keep the licence plate exactly as it appears in the source (do not invent text).
- Preserve the original camera angle and the vehicle's orientation. Do not rotate,
  flip, re-pose or re-render the car from a different viewpoint.
- Output must look like a real photograph, never an illustration, render or painting.
`.trim();

/** What to remove / clean up from the source vehicle. */
const CLEANUP_RULES = `
CLEAN-UP & ENHANCEMENT:
- Remove the entire original background and every other vehicle, person, building,
  sign, pole and distraction. Only the chosen background scene may remain.
- Reduce harsh sun glare, blown-out hotspots and mirror-like reflections on the
  paintwork, bonnet, roof and windscreen, while keeping the paint's natural gloss.
- Gently reveal the cabin through the glass if it is washed out by reflections,
  but never fabricate a fake interior — keep it subtle and realistic.
- Remove dirt smudges, dust, watermarks, timestamps and any overlaid text.
- Refine the cut-out edges so they are crisp and natural around mirrors, aerials,
  wheel arches and tyres — no haloing, no leftover background fringe.
- Improve overall sharpness, white balance and contrast to a clean, premium finish.
`.trim();

/** How the vehicle must integrate with the new scene. */
const INTEGRATION_RULES = `
SCENE INTEGRATION (make it believable):
- Place the vehicle naturally on the ground plane of the provided background so it
  appears genuinely parked there, with correct scale and a realistic eye-level.
- Match the background's lighting direction, intensity and colour temperature onto
  the car so highlights and shadows on the body agree with the scene's light source.
- Generate soft, physically-plausible CONTACT SHADOWS and ground reflection beneath
  the tyres and chassis, falling in the same direction as the scene lighting. The
  shadow must anchor the car to the ground — not float, not be a hard black blob.
- Match perspective and depth of field so the car and background share one camera.
- Add subtle, realistic environmental reflections from the new scene onto the glass
  and glossy panels, consistent with the surroundings.
`.trim();

/** Final output framing / composition. */
const COMPOSITION_RULES = `
COMPOSITION & OUTPUT:
- Professional automotive advertising composition: the vehicle is the clear hero,
  well-framed and centred with tasteful headroom and ground room.
- Clean, distraction-free result suitable for dealership websites, Carsales,
  Facebook and Google Ads.
- Photorealistic, high-resolution, colour-accurate, ready to publish as-is.
`.trim();

/**
 * Build the full enhancement prompt.
 * @param {object} [opts]
 * @param {string} [opts.notes] - Optional dealer instructions appended to the brief.
 * @returns {string}
 */
export function buildVehicleEnhancementPrompt(opts = {}) {
  const { notes } = opts;

  const base = `
You are an expert automotive retoucher and compositor producing dealership-grade
marketing photography.

TASK: Using IMAGE 1 (the source VEHICLE) and IMAGE 2 (the destination BACKGROUND),
produce a single photorealistic image of the SAME vehicle from IMAGE 1, cleanly
cut out from its original surroundings and naturally placed into the scene from
IMAGE 2 — finished to professional advertising quality.

${FIDELITY_RULES}

${CLEANUP_RULES}

${INTEGRATION_RULES}

${COMPOSITION_RULES}
`.trim();

  const dealerNotes = notes && notes.trim()
    ? `\n\nADDITIONAL DEALER INSTRUCTIONS (apply without breaking the rules above):\n${notes.trim()}`
    : '';

  return `${base}${dealerNotes}`;
}

/**
 * Variant prompt for when NO background image is supplied — the model should
 * instead place the vehicle on a clean, neutral studio-style backdrop.
 */
export function buildStudioEnhancementPrompt(opts = {}) {
  const { notes } = opts;
  const base = `
You are an expert automotive retoucher producing dealership-grade marketing photography.

TASK: Using IMAGE 1 (the source VEHICLE), cleanly remove the original background and
present the SAME vehicle on a clean, seamless, softly-lit neutral studio backdrop
(light grey gradient) with a polished reflective floor.

${FIDELITY_RULES}

${CLEANUP_RULES}

STUDIO INTEGRATION:
- Even, soft, professional studio lighting with gentle wrap highlights along the body.
- Soft contact shadow and a tasteful floor reflection beneath the tyres.
- No props, no text, no other objects — only the hero vehicle on the backdrop.

${COMPOSITION_RULES}
`.trim();

  const dealerNotes = notes && notes.trim()
    ? `\n\nADDITIONAL DEALER INSTRUCTIONS (apply without breaking the rules above):\n${notes.trim()}`
    : '';

  return `${base}${dealerNotes}`;
}

export default buildVehicleEnhancementPrompt;
