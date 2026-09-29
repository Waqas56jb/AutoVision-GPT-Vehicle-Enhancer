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
 *     → buildDetailPrompt() kept as a safety fallback. The enhance pipeline
 *       does not call gpt-image-1 for detail shots — original pixels are returned.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Prepended to every gpt-image-1 edit prompt. Classifier skip is the hard gate
 * (no edit call at all); this is the safety net if a non-vehicle still reaches
 * the model, or if IMAGE 2 tempts it to invent a car.
 */
export const HARD_INPUT_SAFETY_RULES = `
HARD INPUT SAFETY RULES — IMAGE 1 IS THE SOURCE OF TRUTH.


1. If IMAGE 1 contains no real vehicle or real physical vehicle part, reproduce IMAGE 1 unchanged.
2. Never invent a vehicle merely because IMAGE 2 is provided.
3. Never turn an empty showroom, room, building, or background plate into a vehicle interior.
4. Never invent wheels, tires, steering wheels, dashboards, cabins, mirrors, seats, LEDs, screens, or vehicle bodywork.
5. Never turn a robot, cartoon, illustration, logo, meme, or graphic into a vehicle or vehicle detail.
6. A robot/cartoon shown ON a real vehicle screen is screen content, not evidence of a standalone non-vehicle image.
7. A real vehicle infotainment/display close-up remains a vehicle DETAIL regardless of what the screen displays.
8. Never use IMAGE 2 to create a missing vehicle; IMAGE 2 is only an optional background plate for an already-visible real vehicle.
9. If there is no real vehicle evidence in IMAGE 1, perform ZERO visual edits and preserve the original pixels.
10. When uncertain whether a vehicle is actually present, preserve IMAGE 1 unchanged rather than inventing vehicle context.
`.trim();

function withInputSafety(body) {
  return `${HARD_INPUT_SAFETY_RULES}\n\n${body}`;
}

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
- Every stripe, decal, wrap, pinstripe, two-tone roof and contrast bonnet panel —
  same shape, same colour, same place. A black bonnet stripe on IMAGE 1 is a black
  bonnet stripe on the output; it is part of the car, not dirt or a reflection.

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

/**
 * Appended right after RULE ZERO when the car MOVES to a new scene (replace /
 * studio). Not used for keep-background, where the original reflections are the
 * correct ones. Without it, "copy the car pixel for pixel" made the model copy
 * the old street's buildings in the windscreen — the clearest pasted-car tell.
 */
const REFLECTION_EXCEPTION = `
THE ONE EXCEPTION — REFLECTIONS ARE NOT PART OF THE CAR:
- The buildings, trees, sky, street and other cars mirrored in the windscreen, windows,
  wing mirrors and glossy paint of IMAGE 1 are light from the OLD location. They are
  not the car's design and must NOT be copied. Copying them is what makes a car look
  cut out and pasted. Replace them with reflections of the new scene.
- This exception covers reflections only. Badges, stripes, decals, tint and trim stay.
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

REFLECTIONS MUST BELONG TO THE NEW SCENE — the most common giveaway of a pasted car:
- Remove EVERY reflection of the ORIGINAL location: buildings, windows, trees, sky,
  clouds, street lights, other cars, people and the photographer.
- Check each surface one by one: windscreen, side windows, rear glass, the wing-mirror
  GLASS and the mirror HOUSINGS, bonnet, roof, doors, bumpers, chrome and wheels.
- In their place show only soft reflections of the new scene (its lights, walls, sky
  and floor) or a clean neutral gradient that agrees with it.
- Reflections are surface light, not design: removing them must never remove a
  stripe, decal, badge or trim piece, and must never invent a cabin interior.
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
    margin: 'about one-seventh (14%) of the frame width',
    note: 'the car reads large, with a little scene either side',
  },
  large: {
    margin: 'about one-tenth (10%) of the frame width',
    note: 'this is the house standard — match it unless told otherwise',
  },
  hero: {
    margin: 'about one-twentieth (5%) of the frame width',
    note: 'a tight, bold hero crop — the car nearly touches the side edges',
  },
};

export const FRAMING_LEVELS = Object.keys(FRAMING_PRESETS);
export const DEFAULT_FRAMING = 'large';

/**
 * The GUARANTEED car width (as a fraction of the output width) that the
 * post-generation auto-frame enforces. The prompt margins above are a hint to
 * the model; THIS is the promise to the client, applied deterministically after
 * the render in autoFrame.service.js.
 *
 * Set deliberately large: the client rejected the output repeatedly for the car
 * being too small, including in "hero" mode, which was actually landing at
 * ~60–75%. These values (override with FRAMING_FILL_* env vars) are what finally
 * make "large" and "hero" look like the guide images.
 */
export const FRAMING_FILL = {
  standard: Number(process.env.FRAMING_FILL_STANDARD) || 0.82,
  large: Number(process.env.FRAMING_FILL_LARGE) || 0.9,
  hero: Number(process.env.FRAMING_FILL_HERO) || 0.95,
};

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
- LEVEL THE SHOT: the finished image must be perfectly level and upright. If the
  input was taken on a slight angle, correct it — the ground line is horizontal and
  the car stands straight, not leaning. (Levelling only; do not change which way it faces.)
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
- It must look like a real factory paint photographed in this light: panels facing
  away from the light are clearly darker, highlights are lighter, and the scene still
  reflects in the clear coat. Do NOT exaggerate saturation or brightness — no neon,
  no toy-like or CGI look.
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

  return withInputSafety(`${`
You are an expert automotive retoucher preparing a dealership advertisement.

TASK: Take the vehicle in IMAGE 1, cut it cleanly out of its surroundings, and place
that SAME vehicle into the scene from IMAGE 2. Produce one photorealistic advertising
image, finished to professional dealership standard.

${FIDELITY_RULES}

${REFLECTION_EXCEPTION}

${CLEANUP_RULES}

${INTEGRATION_RULES}

${composition(framing)}
${clause ? `\n${clause}\n` : ''}
`.trim()}${dealerNotes(notes)}`);
}

/**
 * EXTERIOR, no background supplied — a clean studio sweep instead.
 */
export function buildStudioEnhancementPrompt(opts = {}) {
  const { notes, framing = DEFAULT_FRAMING, colorName, colorHex } = opts;
  const clause = recolorClause(colorName, colorHex);

  return withInputSafety(`${`
You are an expert automotive retoucher preparing a dealership advertisement.

TASK: Take the vehicle in IMAGE 1, remove its original background, and present that
SAME vehicle on a clean, seamless, softly-lit neutral studio backdrop (light grey
gradient) standing on a polished reflective floor.

${FIDELITY_RULES}

${REFLECTION_EXCEPTION}

${CLEANUP_RULES}

STUDIO INTEGRATION:
- Even, soft, professional studio lighting with gentle wrap highlights along the body.
- A tight dark contact shadow under each tyre, plus a soft cast shadow on the floor.
- A restrained reflection of the car in the polished floor.
- No props, no text, no other objects — only the car on the backdrop.

REFLECTIONS MUST BELONG TO THE NEW SCENE — the most common giveaway of a pasted car:
- Remove EVERY reflection of the ORIGINAL location: buildings, windows, trees, sky,
  clouds, street lights, other cars, people and the photographer.
- Check each surface one by one: windscreen, side windows, rear glass, the wing-mirror
  GLASS and the mirror HOUSINGS, bonnet, roof, doors, bumpers, chrome and wheels.
- In their place show only soft reflections of the studio (its softboxes, backdrop
  and floor) or a clean neutral gradient that agrees with it.
- Reflections are surface light, not design: removing them must never remove a
  stripe, decal, badge or trim piece, and must never invent a cabin interior.

${composition(framing)}
${clause ? `\n${clause}\n` : ''}
`.trim()}${dealerNotes(notes)}`);
}

/**
 * KEEP the original background — enhance in place.
 */
export function buildKeepBackgroundPrompt(opts = {}) {
  const { notes, colorName, colorHex } = opts;
  const clause = recolorClause(colorName, colorHex);

  return withInputSafety(`${`
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
`.trim()}${dealerNotes(notes)}`);
}

/**
 * INTERIOR — dashboard, seats, boot.
 *
 * The client's ask: "when there is glass in the background, can we have the
 * showroom that is showing?" So the cabin is left completely alone and ONLY the
 * view through REAL windows is replaced. Digital displays (backup camera, maps)
 * are hardware, not windows — treating them as glass made gpt-image-1 paste the
 * showroom into the LED and invent a steering wheel around a screen close-up.
 */
export function buildInteriorPrompt(opts = {}) {
  const { notes, hasBackground } = opts;
  const image2Block = hasBackground
    ? `IMAGE 2 is the dealership/showroom reference. Use it only where a REAL physical window view exists in IMAGE 1. Never use IMAGE 2 to invent missing cabin geometry or expand the crop.`
    : `There is no IMAGE 2. Where a REAL physical window already exists in IMAGE 1, the outside view may become a clean, bright, upmarket car-dealership showroom (glass facade, polished floor, soft daylight), softly defocused. If no real window exists, change no view.`;

  return withInputSafety(`${`
INTERIOR PHYSICAL HARD LOCK — IMAGE 1 IS THE SOURCE OF TRUTH.

Everything physically visible inside the vehicle in IMAGE 1 is immutable.

DO NOT regenerate or reinterpret:
- analog gauges
- gauge numerals
- gauge tick marks
- redlines
- needle positions or angles
- speedometer scales
- tachometer scales
- temperature values
- speed values
- trip/range/odometer values
- warning/status indicators
- dashboard icons
- lane-keep icons
- door-open graphics
- parking indicators
- gear indicators
- physical button icons
- printed button captions such as MODE, OK, SEEK, TRACK, RADIO, MEDIA, SETUP
- voice, phone, star, volume, seek, cruise and other button symbols
- steering-wheel manufacturer logo
- vehicle badges/emblems
- physical switches and knobs
- ignition key
- dealer key tag
- key ring
- stitching
- chrome bezels
- trim geometry
- physical screen bezels
- screen content

Do not redraw, regenerate, improve, modernize, simplify, sharpen into a new form, or reinterpret any of these elements.

The physical geometry, scale, position and appearance of every visible cabin component must remain identical to IMAGE 1.

INPUT IMAGE 1 IS NOT A DESIGN REFERENCE.
IT IS THE ACTUAL VEHICLE.

A buyer must receive an image representing the actual vehicle photographed.

The ONLY environmental replacement allowed is the outside view through an ALREADY-VISIBLE REAL PHYSICAL WINDOW.

A real window requires actual vehicle glass plus recognizable physical surrounding structure such as a frame, pillar, seal, door structure or window trim.

A digital display is NEVER a window.

An infotainment screen, backup-camera screen, navigation display, instrument display or LCD/LED panel must remain unchanged, including everything shown on it.

Never replace screen content with the showroom.

Never invent a window because a screen contains an outdoor-looking image.

Never use IMAGE 2 to create missing cabin components.

Never zoom out or expand the crop to invent a wider interior.

If any requested cleanup could alter a number, glyph, icon, logo, needle, button, key, tag, stitching, bezel or screen, do not perform that cleanup.

Preserve the original element instead.

No marketing graphics may be generated by the image model.

IMAGE 1 = source vehicle image.

Create an interior dealership/showroom version while preserving IMAGE 1 as the physical source of truth.

CRITICAL SCREEN/WINDOW RULE:
A DIGITAL DISPLAY IS NOT A WINDOW.

Every infotainment screen, LCD, LED display, instrument display, backup-camera display, navigation display, radio/media screen, or other digital display visible in IMAGE 1 is VEHICLE HARDWARE. NEVER replace, repaint, reinterpret, or composite the showroom into a digital display.

Digital displays must remain visually identical to IMAGE 1:
- same screen location
- same shape and dimensions
- same bezel
- same buttons and controls
- same displayed content
- same backup-camera feed
- same parking guidelines
- same text/UI
- same brightness/appearance
- no showroom reflection or showroom scene inserted into the display

ONLY a PHYSICAL REAL WINDOW may receive a changed outside view.

A real window must be identifiable from the physical vehicle structure: glass/opening plus surrounding frame, pillar, seal, trim, or door structure. Do not infer a window merely because a rectangular area displays an outdoor-looking image.

If IMAGE 1 contains no identifiable real window, DO NOT ADD ONE and DO NOT CHANGE ANY DISPLAY CONTENT. Perform only appropriate interior/showroom cleanup.

FRAMING IS LOCKED:
Preserve the exact crop, camera viewpoint, perspective, field of view, and visible vehicle geometry from IMAGE 1.

Do NOT zoom out.
Do NOT widen the shot.
Do NOT reconstruct the cabin.
Do NOT invent missing vehicle components.
Do NOT add a steering wheel, seats, windshield, side windows, mirrors, dashboard sections, doors, pillars, or other cabin elements that are outside the IMAGE 1 crop.

If IMAGE 1 is a close-up of an infotainment stack or other component, keep it a close-up of that exact component. Do not turn it into a wide interior photograph.

Only modify the outside view through REAL windows that are already physically visible in IMAGE 1. Keep all vehicle hardware and interior geometry unchanged.

${image2Block}

Priority order:
1. Preserve IMAGE 1 physical geometry and crop.
2. Preserve all digital displays exactly.
3. Change only the outside view through already-visible REAL windows.
4. If no real window exists, make no window/view replacement.
5. Never invent missing cabin elements.
`.trim()}${dealerNotes(notes)}`);
}

/**
 * DETAIL close-ups — wheel, badge, headlight, a switch on the door card.
 *
 * The subject already fills the frame; there is no background to replace, and
 * trying to replace one destroys the shot. Clean it up and hand it back.
 */
export function buildDetailPrompt(opts = {}) {
  const { notes } = opts;

  return withInputSafety(`${`
IMAGE 1 IS THE ABSOLUTE PHYSICAL SOURCE OF TRUTH.

This is a DETAIL photograph of a real vehicle or real vehicle component.

Preserve the exact physical object, exact crop, exact camera viewpoint, exact perspective, exact geometry, and exact visible content of IMAGE 1.

DO NOT regenerate, reinterpret, reconstruct, redesign, replace, simplify, improve, or redraw any visible vehicle hardware.

EVERY visible glyph and physical marking is immutable.

LOCK ALL OF THE FOLLOWING EXACTLY:

- every printed word and caption on physical buttons, including MODE, OK, SETUP, SEEK, TRACK, MEDIA, RADIO and any other visible wording
- every physical button icon, including voice-command, phone, star/favorite, volume, seek, cruise-control, lane-control, menu, navigation and other icons
- every button shape, spacing, position, orientation and physical geometry
- every analog gauge numeral
- every analog gauge tick mark
- every gauge scale and redline
- every needle position
- every needle angle
- every gauge arc and geometry
- every cluster number
- every temperature value such as 19°C
- every speed value such as 40
- every trip value
- every range value
- every odometer/trip display
- every dashboard warning/status icon
- lane-keep icons
- door-open vehicle graphics
- parking/status/speed-sign icons
- P / gear / drive indicators
- every HUD marking
- every steering-wheel manufacturer logo and its exact geometry
- every emblem/badge
- every ignition key
- every dealer key tag
- every key ring
- every stitching line
- every chrome bezel
- every physical trim edge
- every vent
- every switch
- every knob
- every physical screen bezel

DIGITAL SCREENS ARE ALSO IMMUTABLE.

Do not replace, regenerate, reinterpret, sharpen into new content, or rewrite anything displayed on a real vehicle screen.

If a screen contains a backup-camera feed, map, cartoon, robot, grass, parked cars, warning message, parking guidelines, or any other content, preserve that exact displayed content.

A DIGITAL DISPLAY IS NOT A WINDOW.

The only permitted environmental modification is the outside view through an ACTUAL PHYSICAL VEHICLE WINDOW when this detail image is explicitly being processed as part of an interior workflow.

A real physical window must have actual vehicle glass and physical surrounding structure such as a pillar, seal, frame, door structure, or window trim.

Never treat an LCD/LED/infotainment display as a window.

CLEANUP IS EXTREMELY LIMITED.

Allowed:
- very mild dust removal
- very mild glare reduction
- very mild white-balance correction

Only perform those changes if they can be made WITHOUT changing, regenerating, moving, simplifying, sharpening into a new form, or otherwise altering any locked glyph, number, icon, logo, needle, button, key, tag, stitching, bezel, or physical component.

If cleanup would risk rewriting any text, number, icon, gauge, logo, needle, button, screen content, or physical marking, DO NOT CLEAN IT.

In that case, preserve IMAGE 1 exactly.

DO NOT zoom out.
DO NOT zoom in.
DO NOT change the crop.
DO NOT widen the field of view.
DO NOT invent surrounding cabin geometry.
DO NOT add a steering wheel.
DO NOT add seats.
DO NOT add a dashboard that is outside the crop.
DO NOT add mirrors.
DO NOT add windows that are not visible.
DO NOT add vehicle components that are outside IMAGE 1.

Do not use IMAGE 2 to invent missing vehicle hardware.

IMAGE 2, if provided, may only supply the outside environment visible through an already-visible REAL physical window.

No marketing graphics are permitted.

Do not create:
- warranty banners
- headers
- footers
- dealership bars
- logos as marketing graphics
- badges
- promotional text
- overlay cards

The final image must remain the same real vehicle detail photograph from IMAGE 1, with only safe and minimal cleanup where absolutely risk-free.
`.trim()}${dealerNotes(notes)}`);
}

export default buildVehicleEnhancementPrompt;
