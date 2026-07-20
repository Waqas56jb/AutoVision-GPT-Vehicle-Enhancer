/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AutoVision GPT — Vehicle Enhancement Prompt Engineering
 * ─────────────────────────────────────────────────────────────────────────────
 *  Produces the instruction that drives the gpt-image edit call.
 *
 *  Image inputs (order matters — the prompt refers to them by number):
 *    [0] VEHICLE    — the photographer's raw shot (any location / lighting)
 *    [1] BACKGROUND — the destination scene the vehicle must be placed into
 *
 *  ── Tuned against the client's own feedback ────────────────────────────────
 *
 *  1. "It's actually changed their headlights on the car, and also changed the
 *     whole model of some of the cars."
 *     → FIDELITY comes FIRST and is written as a hard commercial constraint, not
 *       a stylistic preference. It is also backed by `input_fidelity: 'high'` on
 *       the API call, which is the real lever (see openai.service.js).
 *     → The old prompt CONTRADICTED itself: it demanded "preserve the original
 *       camera angle and the vehicle's orientation" and then asked for "a
 *       flattering three-quarter framing that shows the front and one side".
 *       That second clause licenses the model to re-pose — i.e. to re-draw — the
 *       car. It is gone.
 *
 *  2. "The vehicle on the right occupies about 65% of the image and your
 *     creation is about 50%. Do you agree?"
 *     → Framing is now expressed as MARGINS, not as a percentage. A model cannot
 *       measure "65% of the frame", but it can leave "a margin of about
 *       one-sixth of the frame on each side", which is the same thing and is
 *       something it can actually see itself doing.
 *
 *  3. "How about the interior images... when there is glass in the background,
 *     can we have the showroom that is showing?"
 *     → buildInteriorPrompt().
 *
 *  4. Wheel / badge / switch close-ups have no background to replace.
 *     → buildDetailPrompt(): clean up only, change nothing else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The rules that keep the advertised car the same car that is for sale.
 * Deliberately blunt: this is a legal and commercial constraint, not a taste one.
 */
const FIDELITY_RULES = `
RULE ZERO — THE CAR MUST NOT CHANGE. THIS OVERRIDES EVERYTHING ELSE.

This is a real, specific vehicle that a real buyer will come and inspect in person.
If the advertised car does not match the car on the lot, the advertisement is false
and unusable. You are RELOCATING a photograph of this car. You are NOT imagining,
redesigning, restyling or re-rendering a car.

Copy the vehicle from IMAGE 1 exactly as photographed. Every one of these must be
IDENTICAL to IMAGE 1, pixel for pixel:
- Headlight and taillight shape, internal lens detail and light signature.
- Grille pattern, mesh, chrome surrounds and lower air intakes.
- Every badge, emblem, model name and lettering — exactly as written, in the same place.
- Body shape, roofline, window line, panel gaps, creases and body-kit details.
- Number of doors, mirror shape, aerial, door handles, spoiler.
- Wheel and rim design, spoke count, brake calipers, tyre profile and sidewall.
- The car's colour, trim level and any dealer stickers.

BRANDING AND NAMES — THE MOST SERIOUS RULE HERE:
- NEVER change the manufacturer. Do not turn this car into a different brand.
- NEVER write a brand or model name onto the car that is not already in IMAGE 1.
  Do not add "RANGE ROVER", "LAND ROVER", "TOYOTA", "LEXUS" or ANY other maker's name
  or logo. If IMAGE 1 has no lettering on the bonnet, doors or tailgate, the finished
  image must have none either.
- If IMAGE 1 DOES show a name or badge, copy it CHARACTER FOR CHARACTER. Do not correct
  its spelling, do not re-space it, do not swap it for a brand you recognise, and do not
  "improve" an unfamiliar marque into a familiar one.
- Many of these vehicles are makes you may not recognise. An unfamiliar grille or badge
  is NOT an error to be fixed — it is the actual car being sold. Reproduce it as-is.
- Putting another manufacturer's name on a car is trademark infringement and makes the
  advertisement fraudulent. This is the single worst mistake you can make here.

NUMBER PLATES — READ THIS TWICE:
- If IMAGE 1 shows a number plate, reproduce it EXACTLY: same characters, same colours,
  same state or country design, same mounting position. Never re-letter it, never
  "tidy" it, never substitute a different plate.
- If IMAGE 1 shows NO plate on that end of the car — an empty bumper, a blank recess, a
  plain grille — then the finished image must ALSO show no plate there. Leave the bumper
  exactly as photographed.
- NEVER invent a plate. Never add one because "a car should have one". A fabricated
  registration on a dealership advertisement is a serious problem, not a detail.

FORBIDDEN, without exception:
- Do NOT swap the car for a different make, model, generation or body style.
- Do NOT redesign the headlights, grille or wheels — not even "improved" versions.
- Do NOT stylise, idealise or "make it look better". Photographic realism only.

VIEWPOINT vs LEVELLING — these are two different things, do not confuse them:

  FORBIDDEN — changing which side of the car we are looking at:
  - Do NOT mirror or flip the image. If the car faces LEFT in IMAGE 1 it must face LEFT
    in the output; if it faces RIGHT it must stay facing RIGHT. Check this before you
    finish: the same headlight, the same door, the same wheel must be nearest the camera.
  - Do NOT re-pose the car, swing it around, or re-photograph it from another position.
  - Do NOT change a rear view into a front view, or a side view into a three-quarter view.
  - The camera's POSITION relative to the car must not move.

  REQUIRED — levelling a crooked photo:
  - These photos are taken quickly on a phone and are often tilted a few degrees.
    Correct that: the finished image must sit LEVEL, with the horizon, the kerb, the
    building lines and the ground plane horizontal, and the car sitting flat and upright
    rather than leaning.
  - Do this the way a photographer does — rotate the whole frame slightly and crop — NOT
    by re-drawing the car from a different angle.
  - Levelling changes the TILT of the picture. It must never change which way the car
    faces or which side of it we can see.

If you are unsure about a detail, reproduce what IMAGE 1 shows. Never invent.
`.trim();

/** What to clean up, without touching the car's identity. */
const CLEANUP_RULES = `
CLEAN-UP (applies to the scene and the finish, never to the car's design):
- Remove the entire original background: other vehicles, people, buildings, signs,
  poles, bins, fences and every other distraction. Only the new scene may remain.
- GLARE & REFLECTIONS: remove harsh sun glare, blown-out white hotspots, sky
  reflections and mirror-like flares from the bonnet, roof, doors and windscreen.
  The paint should read as an even, premium finish with natural soft gloss only.
- Even out lighting across the body so one side is not washed out by direct sun.
- Where reflections hide the cabin, let the glass read naturally — but never invent
  an interior that is not there.
- Remove dirt, dust, water spots, watermarks, timestamps and any overlaid text.
- Cut-out edges must be crisp and natural around mirrors, aerials, wheel arches and
  tyres. No halo, no fringe, no leftover background.
- Finish with clean sharpness, correct white balance and contrast.
`.trim();

/** How the car must sit in the new scene. */
const INTEGRATION_RULES = `
SCENE INTEGRATION — it must look genuinely photographed there, not pasted:
- Stand the vehicle on the ground plane of IMAGE 2 at a believable scale and eye level.
- Match IMAGE 2's lighting direction, intensity and colour temperature onto the car,
  so the highlights and shading on the body agree with the scene's light.
- SHADOWS (this is what sells it). Build them in two layers:
    (a) a tight, dark contact shadow exactly where each tyre meets the ground, and
        under the sills and bumpers — the car must look connected to the floor;
    (b) a softer cast shadow spreading away from the car in the SAME direction as
        the scene's light, fading with distance.
  Never a floating car. Never a flat black oval. Never a faint grey smudge.
  Hard sunlight = crisper shadow edge. Overcast or indoor = very soft.
- If the floor is polished, tiled or wet, add a faint, believable reflection of the
  car in it — subtle, not a mirror.
- Share one camera between car and background: matching perspective and depth of field.
- Let the new scene cast subtle, appropriate reflections onto the glass and paint.
`.trim();

/**
 * Framing.
 *
 * Expressed as MARGINS rather than a percentage on purpose. The old prompt asked
 * for "78–86% of the frame width" and the client measured the result at 50%: a
 * model cannot check its own arithmetic, but it can see that it has left a gap of
 * roughly one-sixth of the frame beside the car.
 */
const FRAMING_PRESETS = {
  standard: {
    margin: 'about one-fifth (20%) of the frame width',
    note: 'the car reads large, with a little scene either side',
  },
  large: {
    margin: 'about one-sixth (15–17%) of the frame width',
    note: 'this is the house standard — match it unless told otherwise',
  },
  hero: {
    margin: 'about one-twelfth (8%) of the frame width',
    note: 'a tight, bold hero crop',
  },
};

export const FRAMING_LEVELS = Object.keys(FRAMING_PRESETS);
export const DEFAULT_FRAMING = 'large';

function composition(framing = DEFAULT_FRAMING) {
  const p = FRAMING_PRESETS[framing] || FRAMING_PRESETS[DEFAULT_FRAMING];
  return `
COMPOSITION — THE CAR IS THE PRODUCT, THE BACKGROUND IS ONLY THE STAGE:
- The vehicle must DOMINATE the frame. Scale the car UP. Do not shrink it to show
  more scenery — empty sky, empty road and empty floor are wasted advertising space.
- Leave a margin of ${p.margin} between the car's bodywork and the left edge, and the
  same again on the right (${p.note}). The car's front and rear should come close to
  those margins.
- Vertically: a small amount of headroom above the roof, and enough floor below the
  tyres to carry the shadow. The car should sit slightly below the centre line.
- Centre the car horizontally. Keep the SAME viewpoint as IMAGE 1 — do not re-angle
  the car to make it "more flattering".
- The background must read as a clean, quiet backdrop, never competing with the car.
- Every image in a batch must be framed the SAME way. Consistency across a listing
  matters more than any single photo being unusually striking.
- Photorealistic, colour-accurate, ready to publish on Carsales, a dealer website,
  Facebook or Google Ads with no further editing.
`.trim();
}

/** Optional paint-colour change, appended when a target colour is chosen. */
export function recolorClause(colorName, colorHex) {
  if (!colorName) return '';
  return `
PAINT COLOUR CHANGE (apply this, and only this, to the car):
- Repaint the body panels ${colorName}${colorHex ? ` (approximately ${colorHex})` : ''}.
- ONLY the painted panels: bonnet, doors, roof, guards, boot and painted bumpers.
- Do NOT tint the wheels, tyres, glass, lights, grille, badges, plate, chrome or trim.
- Keep the paint's existing highlights, reflections and shading — re-render them in the
  new colour under the same light. It must look like real automotive paint with correct
  gloss and depth, not a flat colour fill.
- Everything in RULE ZERO still applies. The colour changes; the CAR does not.`.trim();
}

/** Notes from the dealer, appended without letting them override the hard rules. */
function dealerNotes(notes) {
  if (!notes || !notes.trim()) return '';
  return `\n\nADDITIONAL DEALER INSTRUCTIONS (apply only where they do not conflict with RULE ZERO):\n${notes.trim()}`;
}

/**
 * EXTERIOR + new background. The main path.
 */
export function buildVehicleEnhancementPrompt(opts = {}) {
  const { notes, framing = DEFAULT_FRAMING, colorName, colorHex } = opts;
  const clause = recolorClause(colorName, colorHex);

  return `${`
You are an expert automotive retoucher preparing a dealership advertisement.

TASK: Take the vehicle in IMAGE 1, cut it cleanly out of its surroundings, and place
that SAME vehicle into the scene from IMAGE 2. Produce one photorealistic advertising
image, finished to professional dealership standard.

${FIDELITY_RULES}

${CLEANUP_RULES}

${INTEGRATION_RULES}

${composition(framing)}
${clause ? `\n${clause}\n` : ''}
`.trim()}${dealerNotes(notes)}`;
}

/**
 * EXTERIOR, no background supplied — a clean studio sweep instead.
 */
export function buildStudioEnhancementPrompt(opts = {}) {
  const { notes, framing = DEFAULT_FRAMING, colorName, colorHex } = opts;
  const clause = recolorClause(colorName, colorHex);

  return `${`
You are an expert automotive retoucher preparing a dealership advertisement.

TASK: Take the vehicle in IMAGE 1, remove its original background, and present that
SAME vehicle on a clean, seamless, softly-lit neutral studio backdrop (light grey
gradient) standing on a polished reflective floor.

${FIDELITY_RULES}

${CLEANUP_RULES}

STUDIO INTEGRATION:
- Even, soft, professional studio lighting with gentle wrap highlights along the body.
- A tight dark contact shadow under each tyre, plus a soft cast shadow on the floor.
- A restrained reflection of the car in the polished floor.
- No props, no text, no other objects — only the car on the backdrop.

${composition(framing)}
${clause ? `\n${clause}\n` : ''}
`.trim()}${dealerNotes(notes)}`;
}

/**
 * KEEP the original background — enhance in place.
 */
export function buildKeepBackgroundPrompt(opts = {}) {
  const { notes, colorName, colorHex } = opts;
  const clause = recolorClause(colorName, colorHex);

  return `${`
You are an expert automotive retoucher enhancing a dealership photo while KEEPING its
original background.

TASK: Reproduce the SAME scene — same background, same camera angle, same vehicle
position, pose and framing. Do NOT replace, move or regenerate the background. Improve
the image to clean, photorealistic dealership advertising quality.

${FIDELITY_RULES}

ENHANCE (without changing the scene):
- Reduce harsh sun glare, blown-out hotspots and mirror-like reflections on the paint,
  bonnet, roof and windscreen. Keep natural gloss.
- Remove dirt, dust, watermarks, timestamps and overlaid text.
- Clean and sharpen the image; correct white balance and contrast.
- Strengthen the existing contact and cast shadow so the car sits believably on the
  ground, in the same direction as the scene's light.
${clause ? `\n${clause}\n` : ''}
OUTPUT: the same scene and framing, enhanced${colorName ? ` and recoloured to ${colorName}` : ''}, dealership-ready.
`.trim()}${dealerNotes(notes)}`;
}

/**
 * INTERIOR — dashboard, seats, boot.
 *
 * The client's ask: "when there is glass in the background, can we have the
 * showroom that is showing?" So the cabin is left completely alone and ONLY the
 * view through the windows is replaced. Getting greedy here — "improving" the
 * dashboard — would wreck the shot.
 */
export function buildInteriorPrompt(opts = {}) {
  const { notes, hasBackground } = opts;
  const throughGlass = hasBackground
    ? `the showroom scene from IMAGE 2`
    : `a clean, bright, upmarket car-dealership showroom: glass facade, polished floor, soft daylight`;

  return `${`
You are an expert automotive retoucher finishing an INTERIOR photo of a car for a
dealership listing.

TASK: Keep the cabin EXACTLY as photographed. Change ONLY what can be seen OUTSIDE the
car through its windows and glass.

RULE ZERO — THE CABIN MUST NOT CHANGE:
- The dashboard, screens, steering wheel, seats, trim, stitching, buttons, switches,
  vents, gear selector and boot lining must be IDENTICAL to IMAGE 1.
- Whatever is displayed on the infotainment screen and instrument cluster stays exactly
  as it is. Do not re-render, re-word or "tidy" the screens.
- Do not change materials, colours, textures or the layout of any control.
- Do not change the camera angle or re-frame the shot. Same viewpoint, same crop.

REPLACE ONLY THE VIEW THROUGH THE GLASS:
- Wherever the outside world is visible through the windscreen, side windows, rear
  window or open boot — replace that view with ${throughGlass}.
- Remove the street, other cars, houses, trees, signs and sky that currently show
  through the glass.
- The view outside must be DEFOCUSED and softly blurred, as it genuinely would be when
  the camera is focused on the dashboard. It must sit behind the glass, not on top of it.
- Keep the glass reading as glass: preserve its reflections, tint and any window frame,
  pillar or seal in front of it.
- Match the outside light to the cabin's existing exposure so it does not look pasted in.

CLEAN-UP: remove dust, smudges, fingerprints, watermarks and any overlaid text.

OUTPUT: the same interior photo, same angle, same crop — now looking like it was taken
inside the dealership.
`.trim()}${dealerNotes(notes)}`;
}

/**
 * DETAIL close-ups — wheel, badge, headlight, a switch on the door card.
 *
 * The subject already fills the frame; there is no background to replace, and
 * trying to replace one destroys the shot. Clean it up and hand it back.
 */
export function buildDetailPrompt(opts = {}) {
  const { notes } = opts;

  return `${`
You are an expert automotive retoucher finishing a CLOSE-UP DETAIL photo for a
dealership listing (a wheel, a badge, a headlight, a switch, a screen, a mirror).

TASK: Clean and polish this photograph. Change NOTHING about what it shows.

RULE ZERO — THE SUBJECT MUST NOT CHANGE:
- Reproduce the part EXACTLY: same shape, same lettering, same finish, same wear.
- Badge and model text must read exactly as it does in IMAGE 1.
- Wheel and rim design, spoke count, tyre sidewall text and brake caliper: identical.
- Do NOT replace or regenerate the background. Do NOT re-frame, re-angle or re-crop.
- Do NOT invent detail that is not in the photograph.

CLEAN UP ONLY:
- Reduce harsh glare and blown-out hotspots; keep natural gloss and metallic sheen.
- Remove dust, dirt, smudges, fingerprints, water spots, watermarks and overlaid text.
- Correct white balance and contrast; sharpen gently.

OUTPUT: the same photograph, same crop, same subject — just clean and print-ready.
`.trim()}${dealerNotes(notes)}`;
}

export default buildVehicleEnhancementPrompt;
