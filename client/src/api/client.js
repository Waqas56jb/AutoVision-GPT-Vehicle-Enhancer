import axios from 'axios';

/**
 * Pre-configured axios instance. Uses VITE_API_BASE_URL when provided,
 * otherwise falls back to the Vite dev proxy ("/api").
 */
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '';

export const apiClient = axios.create({
  baseURL,
  timeout: 180_000, // image generation can take a while
});

/** Build an absolute URL for a backend static asset (e.g. a preset background). */
export function assetUrl(pathname) {
  if (!pathname) return pathname;
  if (/^https?:\/\//.test(pathname)) return pathname;
  return `${baseURL}${pathname}`;
}

export default apiClient;
