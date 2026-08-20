/**
 * Persistent storage for user-uploaded background scenes.
 *
 * Why this exists: the API saves uploads to the server disk, but that disk is
 * ephemeral on serverless hosts (and wiped on container restart). React state
 * and object URLs also vanish on refresh. IndexedDB keeps the actual image
 * blob on this device so the library and the selected scene survive reload.
 *
 * Server starters (shipped files) are NOT duplicated here — they are listed
 * from GET /api/backgrounds as before. User uploads always land here first.
 */

const DB_NAME = 'autovision';
const DB_VERSION = 1;
const STORE = 'backgrounds';

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open background storage.'));
  });
}

/**
 * Run one object-store operation and wait for the transaction to finish.
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} operation
 */
async function withStore(mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let req;
    try {
      req = operation(store);
    } catch (err) {
      db.close();
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      resolve(req.result);
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error || new Error('Background storage transaction failed.'));
      db.close();
    };
    tx.onabort = () => {
      reject(tx.error || new Error('Background storage transaction aborted.'));
      db.close();
    };
  });
}

/**
 * @typedef {object} StoredBackground
 * @property {string} id
 * @property {string} name
 * @property {string} [fileName]
 * @property {string} [mimeType]
 * @property {Blob} blob
 * @property {string|null} [serverUrl]
 * @property {number} [createdAt]
 */

/** @param {StoredBackground} record */
export async function saveBackground(record) {
  if (!record?.id || !record.blob) {
    throw new Error('Cannot save a background without an id and image data.');
  }
  await withStore('readwrite', (store) => store.put(record));
  return record;
}

/** @param {string} id */
export async function getBackground(id) {
  if (!id) return null;
  try {
    const rec = await withStore('readonly', (store) => store.get(id));
    if (!rec?.blob) return null;
    return rec;
  } catch {
    return null;
  }
}

/** @returns {Promise<StoredBackground[]>} */
export async function listStoredBackgrounds() {
  try {
    const rows = await withStore('readonly', (store) => store.getAll());
    return (Array.isArray(rows) ? rows : []).filter((r) => r?.id && r?.blob);
  } catch {
    return [];
  }
}

/** @param {string} id */
export async function deleteStoredBackground(id) {
  if (!id) return false;
  try {
    await withStore('readwrite', (store) => store.delete(id));
    return true;
  } catch {
    return false;
  }
}

export async function hasBackground(id) {
  const rec = await getBackground(id);
  return Boolean(rec);
}

/**
 * Turn a stored blob into a File the enhance API can upload.
 * @param {string} id
 * @returns {Promise<File|null>}
 */
export async function backgroundToFile(id) {
  const rec = await getBackground(id);
  if (!rec?.blob) return null;
  const type = rec.mimeType || rec.blob.type || 'image/jpeg';
  const name = rec.fileName || rec.name || 'background.jpg';
  return new File([rec.blob], name, { type });
}

export default {
  saveBackground,
  getBackground,
  listStoredBackgrounds,
  deleteStoredBackground,
  hasBackground,
  backgroundToFile,
};
