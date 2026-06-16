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

**Why:** Client values reliability/consistency over one-off outputs and asked how to test
independently — deliverable should include a test set + quality checklist + feedback loop.
**How to apply:** Keep the pipeline deterministic; tune the prompt module rather than the
code for quality. Note client also asked for the raw GPT instructions (Waqas declined,
positioning the value as the maintained system).
