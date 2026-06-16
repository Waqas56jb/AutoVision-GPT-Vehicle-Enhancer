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
  },

  upload: {
    maxBytes: Number(optional('MAX_UPLOAD_MB', '25')) * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },

  rateLimit: {
    windowMs: Number(optional('RATE_LIMIT_WINDOW_MIN', '15')) * 60 * 1000,
    max: Number(optional('RATE_LIMIT_MAX', '60')),
  },
};

export default config;
