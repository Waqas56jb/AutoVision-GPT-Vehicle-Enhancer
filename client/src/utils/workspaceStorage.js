/**
 * Persistent workspace: the uploaded vehicle photos and every finished render.
 *
 * Nothing the operator uploads or pays to render should disappear on a refresh,
 * a closed tab or a crash. Photos are stored as blobs, renders as the data URL
 * the API returned. Only an explicit delete (with confirmation / undo) removes
 * anything. Own database, so it never needs a migration of the other stores.
 */

const DB_NAME = 'autovision-workspace';
const DB_VERSION = 1;
const PHOTOS = 'photos';
const RESULTS = 'results';

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(RESULTS)) db.createObjectStore(RESULTS, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open workspace storage.'));
  });
}

async function run(store, mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let req;
    try {
      req = operation(tx.objectStore(store));
    } catch (err) {
      db.close();
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      resolve(req?.result);
      db.close();
    };
    tx.onerror = tx.onabort = () => {
      reject(tx.error || new Error('Workspace storage transaction failed.'));
      db.close();
    };
  });
}

const all = (store) => run(store, 'readonly', (s) => s.getAll()).then((r) => (Array.isArray(r) ? r : []));

/* ── Photos ───────────────────────────────────────────────── */

/** @param {{id:string, file:File, order:number}} p */
export const savePhoto = ({ id, file, order }) =>
  run(PHOTOS, 'readwrite', (s) =>
    s.put({
      id,
      order,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      blob: file,
      savedAt: Date.now(),
    })
  );

export const deletePhoto = (id) => run(PHOTOS, 'readwrite', (s) => s.delete(id));
export const clearPhotos = () => run(PHOTOS, 'readwrite', (s) => s.clear());

/** Restored as real File objects with the SAME name/size/lastModified, so the
 *  photo keeps its identity (stock numbers and tag switches are keyed on it).
 *  @returns {Promise<{file: File, order: number}[]>} in saved order */
export async function loadPhotos() {
  const rows = await all(PHOTOS);
  return rows
    .filter((r) => r?.blob)
    .sort((a, b) => a.order - b.order)
    .map((r) => ({
      order: r.order,
      file: new File([r.blob], r.name, { type: r.type || r.blob.type, lastModified: r.lastModified }),
    }));
}

/* ── Results ──────────────────────────────────────────────── */

export const saveResult = (result) => run(RESULTS, 'readwrite', (s) => s.put({ ...result, savedAt: Date.now() }));
export const clearResults = () => run(RESULTS, 'readwrite', (s) => s.clear());
export async function loadResults() {
  const rows = await all(RESULTS);
  return rows.filter((r) => r?.key && r.image).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
