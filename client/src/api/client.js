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

export default apiClient;
