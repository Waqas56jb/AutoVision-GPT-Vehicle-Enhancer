import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the server root (two levels up from /src/config)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Centralised, validated environment configuration.
 * Everything that reads from process.env should go through this module.
 */
const required = (key) => {
  const value = process.env[key];
  if (!value || value.trim() === '' || value.includes('PASTE_YOUR') || value === 'sk-your-key-here') {
    throw new Error(
      `[config] Missing or placeholder environment variable: ${key}. ` +
        `Please set it in server/.env (see server/.env.example).`
    );
  }
  return value.trim();
};

const optional = (key, fallback) => {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : fallback;
};

export const config = {
  env: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  port: Number(optional('PORT', '5000')),

  clientOrigins: optional('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  openai: {
    apiKey: required('OPENAI_API_KEY'),
    imageModel: optional('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
    imageSize: optional('OPENAI_IMAGE_SIZE', '1536x1024'),
    imageQuality: optional('OPENAI_IMAGE_QUALITY', 'high'),
    // Absorb OpenAI's 429s inside the SDK (exponential backoff) instead of
    // failing the image — expected behaviour once a batch runs wide.
    maxRetries: Number(optional('OPENAI_MAX_RETRIES', '5')),
    // A single high-quality edit runs ~60s; leave generous headroom.
    timeoutMs: Number(optional('OPENAI_TIMEOUT_MS', '180000')),
  },

  upload: {
    maxBytes: Number(optional('MAX_UPLOAD_MB', '25')) * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },

  rateLimit: {
    windowMs: Number(optional('RATE_LIMIT_WINDOW_MIN', '15')) * 60 * 1000,
    // Per IP. A batch is one HTTP request PER IMAGE from a single dealer, so a
    // 100-vehicle run is 100+ requests from one address — the old ceiling of 60
    // rejected a big batch halfway through with our own 429. Keep this
    // comfortably above the largest batch you expect to run in one window.
    max: Number(optional('RATE_LIMIT_MAX', '600')),
  },
};

export default config;
