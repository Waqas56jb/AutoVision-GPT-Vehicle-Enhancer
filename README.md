# AutoVision-GPT-Vehicle-Enhancer

An AI-powered automotive image enhancement platform. A photographer uploads a car photo
taken **anywhere, in any lighting**, optionally picks a background scene, and the app
automatically removes the original background, places the vehicle into the new scene,
matches lighting & perspective, generates realistic contact shadows, reduces glare and
watermarks, and outputs a **dealership-ready** advertising image.

Built for automotive marketing agencies that need consistent, professional results across
thousands of vehicle photos — for Carsales, Facebook Ads, Google Ads and dealership websites.

---

## ✨ Tech stack

| Layer     | Stack |
|-----------|-------|
| Frontend  | React 18, Vite, Tailwind CSS, Framer Motion, react-dropzone, react-compare-slider, react-hot-toast, axios, lucide-react |
| Backend   | Node.js, Express, OpenAI `gpt-image-1`, Sharp, Multer, Helmet, CORS, compression, rate-limiting |
| AI        | OpenAI Images **edit** API with an engineered, deterministic prompt for consistent compositing |

---

## 📁 Project structure

```
AutoVision-GPT-Vehicle-Enhancer/
├── server/                      # Node.js + Express API
│   ├── .env                     # ← your OPENAI_API_KEY goes here (gitignored)
│   ├── .env.example
│   └── src/
│       ├── index.js             # entry point + graceful shutdown
│       ├── app.js               # express app (security, cors, routes)
│       ├── config/              # env + openai client
│       ├── routes/              # health + enhance routes
│       ├── controllers/         # request handling
│       ├── services/            # image (sharp) + openai pipeline
│       ├── prompts/             # state-of-the-art prompt engineering
│       ├── middleware/          # upload, errors, rate limit
│       └── utils/               # logger, ApiError, asyncHandler
└── client/                      # React + Vite frontend
    └── src/
        ├── api/                 # axios client + enhance API
        ├── hooks/               # useEnhance lifecycle hook
        ├── components/          # Header, Dropzone, Workspace, Result, etc.
        ├── constants/ utils/
        ├── App.jsx  main.jsx  index.css
```

---

## 🚀 Getting started

### 1. Backend

```bash
cd server
npm install
# edit .env and paste your real OPENAI_API_KEY
npm run dev      # starts http://localhost:5000
```

### 2. Frontend (in a second terminal)

```bash
cd client
npm install
npm run dev      # starts http://localhost:5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend on port 5000.

---

## 🔌 API

### `POST /api/enhance`  (multipart/form-data)

| Field        | Type | Required | Description |
|--------------|------|----------|-------------|
| `vehicle`    | file | yes      | The car photo |
| `background` | file | no       | Destination scene (omit → clean studio backdrop) |
| `notes`      | text | no       | Extra dealer instructions |

**Response**
```json
{
  "success": true,
  "data": {
    "image": "data:image/png;base64,....",
    "meta": { "model": "gpt-image-1", "size": "1536x1024", "quality": "high", "usedBackground": true, "elapsedMs": 23150 }
  }
}
```

### `GET /api/health`
Liveness + config summary.

---

## 🔐 Notes
- The OpenAI key lives **only** in `server/.env` and never reaches the browser — all model
  calls go through the backend.
- Uploads are processed **in memory** (never written to disk).
- `gpt-image-1` requires a verified OpenAI organization. Configure model/size/quality in `server/.env`.
