---
name: autovision-project
description: AutoVision GPT — Upwork automotive image-enhancement build for client Con Lagos
metadata:
  type: project
---

Upwork trial project ($20 AUD) for client **Con Lagos**, a digital advertising agency
serving car dealerships in Australia. Goal: photographers shoot a car anywhere on a
mobile, upload it + a chosen background, and an automated tool removes the original
background, places the car on the new scene, matches lighting/perspective, generates
realistic contact shadows, reduces glare/reflections/watermarks, and outputs a
dealership-ready advertising image (Carsales, Facebook/Google Ads, websites).

Trial success → potential **up to 50 similar GPTs** at min $20 each (long-term work).
Client previously struggled with prompt-only Custom GPTs being inconsistent; the pitch
was a **structured pipeline** for consistency.

**Built (this repo):** end-to-end app — `server/` (Node.js + Express, modular) calling
OpenAI **gpt-image-1** images.edit with an engineered prompt in
`server/src/prompts/vehicleEnhancement.prompt.js`; `client/` (React + Vite + Tailwind +
framer-motion + react-dropzone + react-compare-slider). OpenAI key lives only in
`server/.env`. Verified working end-to-end against the real key (1536x1024, high quality,
~56s per image).

**Client feedback rounds (key specs):**
- Vehicle must be the dominant subject filling most of the frame; background < 50%
  (the car is the product, not the background). Handled via `framing` presets
  (standard/large/hero) in the prompt module.
- Shadows must look genuinely photographed in-place, not AI-placed (layered
  contact + soft cast shadow). Glare/reflections on paint & windscreen must be removed.
- **Main platform = carsales.com.au, which requires images EXACTLY 1280×853 px.**
  Pipeline generates at 1536×1024 (same 3:2 aspect) then sharp-resizes to 1280×853.
  This is the DEFAULT output format. Other formats: landscape/square/portrait.

**Phase 2 — Colour Change ($10 AUD):** Client wants a "template" mode: given ONE finished
advert image (e.g. white MG4 1280×853), produce the same image (same pose/background/
framing/shadows) with ONLY the car's paint colour changed. Built as a "Colour Change" mode:
`/api/recolor` + `recolor.prompt.js` (preservation-biased), frontend ColorPicker with the 5
client colours (White/Black/Blue/Silver/Red) + "More colours" presets + custom colour, batch
multi-colour with per-variant result cards. Verified end-to-end (1280×853). Pushed to main.

**Phase 3 — client's 6 requirements (via Q&A):** self-service web app (done); saved/preset
backgrounds selectable, no re-upload (built: `server/backgrounds/` folder auto-listed via
`/api/backgrounds`, served static, chosen with `backgroundId`); web app not a ChatGPT GPT,
Mode 2 in same app (clarified honestly); **batch upload 50–100 vehicles** (built:
MultiImageDropzone + `useEnhanceBatch`, concurrency 2, before/after gallery + download-all);
full ownership/handover on client's own OpenAI key + hosting (only external dep = OpenAI API,
pay-per-use); wants a demo/screen-share. Waqas now quoting $15/hr; this recolour/template
task he floated at $100 but client pushing back.

**Why:** Client values reliability/consistency over one-off outputs and asked how to test
independently — deliverable should include a test set + quality checklist + feedback loop.
**How to apply:** Keep the pipeline deterministic; tune the prompt module rather than the
code for quality. Note client also asked for the raw GPT instructions (Waqas declined,
positioning the value as the maintained system).
