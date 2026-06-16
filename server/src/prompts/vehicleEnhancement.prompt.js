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
- IMPORTANT — GLARE & REFLECTION REMOVAL: actively remove harsh sun glare, blown-out
  white hotspots, bright sky reflections and mirror-like flares from the bonnet, roof,
  doors and windscreen. The paint should read as a smooth, even, premium finish with
  only natural soft gloss — no distracting bright patches or sun blobs anywhere.
- Even out uneven lighting across the body so one side is not washed out by sunlight.
- Gently reveal the cabin through the glass if it is washed out by reflections,
  but never fabricate a fake interior — keep it subtle and realistic.
- Remove dirt smudges, dust, watermarks, timestamps and any overlaid text.
- Refine the cut-out edges so they are crisp and natural around mirrors, aerials,
  wheel arches and tyres — no haloing, no leftover background fringe.
- Improve overall sharpness, white balance and contrast to a clean, premium finish.
`.trim();

/** How the vehicle must integrate with the new scene. */
const INTEGRATION_RULES = `
SCENE INTEGRATION (make it believable — it must look genuinely photographed there, NOT AI-placed):
- Place the vehicle naturally on the ground plane of the provided background so it
  appears genuinely parked there, with correct scale and a realistic eye-level.
- Match the background's lighting direction, intensity and colour temperature onto
  the car so highlights and shadows on the body agree with the scene's light source.
- SHADOWS (critical for realism): cast a strong, believable ground shadow beneath and
  to one side of the vehicle, in the SAME direction as the scene's light source. Build
  it in layers: (a) a dark, tight contact/ambient-occlusion shadow exactly where each
  tyre and the underbody meet the ground, then (b) a softer, gradually fading cast
  shadow extending across the ground. The shadow must be grounded and connected to the
  tyres — never floating, never a flat black blob, never a faint grey smudge. Match its
  softness to the scene light (hard sun = crisper edge, overcast = very soft).
- Add a faint, realistic reflection/sheen of the car onto the ground surface if the
  surface is reflective (wet, polished, tiled), consistent with the location.
- Match perspective and depth of field so the car and background share one camera.
- Add subtle, realistic environmental reflections from the new scene onto the glass
  and glossy panels, consistent with the surroundings.
`.trim();

/**
 * Framing presets controlling how much of the frame the vehicle fills.
 * The dealer's #1 note: "the car is the product, not the background."
 */
const FRAMING_PRESETS = {
  standard: 'roughly 70–80% of the frame width',
  large: 'roughly 78–86% of the frame width',
  hero: 'roughly 85–92% of the frame width (a tight, bold hero crop)',
};

export const FRAMING_LEVELS = Object.keys(FRAMING_PRESETS);
export const DEFAULT_FRAMING = 'large';

/**
 * Build the composition rules for a given framing level.
 * @param {keyof typeof FRAMING_PRESETS} framing
 */
function composition(framing = DEFAULT_FRAMING) {
  const fill = FRAMING_PRESETS[framing] || FRAMING_PRESETS[DEFAULT_FRAMING];
  return `
COMPOSITION & OUTPUT (the CAR is the product — the background only sets the scene):
- The vehicle MUST be the dominant subject and fill the MAJORITY of the frame: ${fill}.
  Crop/zoom in tight so the car is large and prominent — scale the car UP rather than
  showing empty scenery, sky or foreground.
- The background must occupy clearly LESS THAN HALF of the image and must never compete
  with or distract from the car.
- Keep only a small, tasteful margin around the car (a little headroom above the roof
  and a little ground below the tyres) — no large empty borders, no tiny car in a big scene.
- Centre the vehicle as the clear hero, like a premium dealership advertising hero shot,
  with a flattering three-quarter framing that shows the front and one side.
- Clean, distraction-free result suitable for dealership websites, Carsales,
  Facebook and Google Ads.
- Photorealistic, high-resolution, colour-accurate, ready to publish as-is.
`.trim();
}

/**
 * Build the full enhancement prompt.
 * @param {object} [opts]
 * @param {string} [opts.notes] - Optional dealer instructions appended to the brief.
 * @returns {string}
 */
export function buildVehicleEnhancementPrompt(opts = {}) {
  const { notes, framing = DEFAULT_FRAMING } = opts;

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

${composition(framing)}
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
  const { notes, framing = DEFAULT_FRAMING } = opts;
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

${composition(framing)}
`.trim();

  const dealerNotes = notes && notes.trim()
    ? `\n\nADDITIONAL DEALER INSTRUCTIONS (apply without breaking the rules above):\n${notes.trim()}`
    : '';

  return `${base}${dealerNotes}`;
}

export default buildVehicleEnhancementPrompt;
