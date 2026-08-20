/**
 * Lightweight localStorage helpers for operator preferences (theme, last
 * background, framing, format). Never used for image blobs — those live in
 * IndexedDB via backgroundStorage.js.
 */

const PREFIX = 'autovision.';

export function getPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setPref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Quota / private mode — preferences are optional. */
  }
}

export function removePref(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export default { getPref, setPref, removePref };
