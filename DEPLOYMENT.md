# Current deployment (Railway)

| Service  | Root Directory | URL |
|----------|----------------|-----|
| Backend  | `server`       | https://autovision-gpt-vehicle-enhancer-production.up.railway.app |
| Frontend | `client`       | https://sweet-joy-production-419e.up.railway.app |

This repo holds TWO apps (`server/`, `client/`). Every Railway service built from it
MUST have **Settings → Source → Root Directory** set, otherwise the build fails with
`Railpack could not determine how to build the app`.

- Backend variables: `OPENAI_API_KEY` (required), `NODE_ENV=production`.
- Frontend: the backend URL is baked in at build time from `client/.env.production`
  (`VITE_API_BASE_URL`). If the frontend service also has a `VITE_API_BASE_URL`
  variable, it OVERRIDES the file — keep it equal to the backend URL above, or delete it.
  After changing either, redeploy the frontend.

---

# Deploying AutoVision GPT to Vercel

You deploy **two separate Vercel projects** from the same GitHub repo:
one for the **server** (root = `server/`) and one for the **client** (root = `client/`).

---

## ⚠️ Important Vercel limits (read first)

| Limit | Value | Impact | Mitigation (already built in) |
|-------|-------|--------|-------------------------------|
| Request body size | **4.5 MB** | Big phone photos would fail to upload | Client compresses images in-browser before upload (`compressImage.js`) |
| Function duration  | **60 s (Hobby)** / 300 s (Pro) | `gpt-image-1` high quality can take ~30–60 s | `maxDuration: 60` set in `server/vercel.json`. If you hit timeouts, lower `OPENAI_IMAGE_QUALITY` to `medium`, or upgrade to **Vercel Pro** |

> For heavy production use, a long-running host (Render, Railway, Fly.io, a VPS) is a
> better fit for the backend than serverless. Vercel works well for the trial/demo.

---

## 1️⃣ Deploy the SERVER (backend)

1. Vercel → **Add New… → Project** → import your GitHub repo.
2. **Root Directory** → click *Edit* → select **`server`**.
3. Framework Preset: **Other** (Vercel will detect the `api/` function automatically).
4. **Environment Variables** (Project Settings → Environment Variables) — add:

   | Key | Value |
   |-----|-------|
   | `OPENAI_API_KEY` | your real OpenAI key |
   | `OPENAI_IMAGE_MODEL` | `gpt-image-1` |
   | `OPENAI_IMAGE_SIZE` | `1536x1024` |
   | `OPENAI_IMAGE_QUALITY` | `high` (use `medium` if you hit 60 s timeouts) |
   | `NODE_ENV` | `production` |
   | `CLIENT_ORIGIN` | your client URL, e.g. `https://autovision-client.vercel.app` |
   | `MAX_UPLOAD_MB` | `25` |

5. **Deploy.** Test it: open `https://<your-server>.vercel.app/api/health` → should return JSON `status: ok`.

> Note: `CLIENT_ORIGIN` you may not know until the client is deployed — deploy the
> client first to get its URL, or come back and update this value, then redeploy.

---

## 2️⃣ Deploy the CLIENT (frontend)

1. Vercel → **Add New… → Project** → import the **same** repo again.
2. **Root Directory** → *Edit* → select **`client`**.
3. Framework Preset: **Vite** (auto-detected).
4. **Environment Variables** — add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | your deployed server URL, e.g. `https://autovision-server.vercel.app` |

   ⚠️ Vite bakes env vars at **build time**, so this must be set *before* the build.
   If you change it later, trigger a **redeploy**.

5. **Deploy.** Open the client URL and run an image through it.

---

## 3️⃣ Wire the two together (CORS)

- The **server** must allow the **client** origin → set `CLIENT_ORIGIN` on the server
  project to the client's Vercel URL (comma-separate multiple, no trailing slash).
- The **client** must point to the **server** → `VITE_API_BASE_URL` = server URL.

After setting both, redeploy whichever project changed.

---

## Local development (unchanged)

```bash
cd server && npm install && npm run dev   # http://localhost:5000
cd client && npm install && npm run dev   # http://localhost:5173
```
Locally, leave `VITE_API_BASE_URL` empty — the Vite proxy handles `/api`.

---

## Quick checklist

- [ ] Server project root = `server`, env `OPENAI_API_KEY` set
- [ ] `GET /api/health` returns ok
- [ ] Client project root = `client`, env `VITE_API_BASE_URL` = server URL
- [ ] Server `CLIENT_ORIGIN` = client URL
- [ ] Ran a real image end-to-end on the deployed client

---

## Railway (current backend host) — car detector

Auto-framing measures the car with a local object detector (`@huggingface/transformers`,
DETR ResNet-50, Apache-2.0). Nothing to configure, but know that:

- On the first start after a deploy, the server downloads the model (~42 MB) from
  huggingface.co and logs `Vehicle detector ready`. Allow ~10 s.
- It uses roughly 200–300 MB of extra RAM.
- If the model cannot load (no internet, unsupported CPU), the log says
  `Vehicle detector unavailable` and framing falls back to the older edge-based
  measurement. Renders never fail because of it.
- `package.json` pins transformers to the server's own `sharp` (the `overrides` entry).
  Do not remove it: two copies of sharp/libvips in one process break image processing.

Marketing tags are drawn in the browser (`client/src/tags`), so tag changes only need
a Vercel (frontend) deploy.
