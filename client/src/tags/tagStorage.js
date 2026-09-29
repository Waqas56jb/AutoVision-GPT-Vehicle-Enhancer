/**
 * Persistent storage for the tag library (saved tags + uploaded fonts).
 *
 * IndexedDB, in its own database so it never needs a version migration of the
 * background store. Logos, graphics and fonts are stored as data URLs inside
 * the records, which keeps export/import to a single self-contained JSON file —
 * that file is how the library moves between devices and team members.
 */

const DB_NAME = 'autovision-tags';
const DB_VERSION = 1;
const TAGS = 'tags';
const FONTS = 'fonts';

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TAGS)) db.createObjectStore(TAGS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FONTS)) db.createObjectStore(FONTS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open tag storage.'));
  });
}

async function withStore(name, mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    let req;
    try {
      req = operation(tx.objectStore(name));
    } catch (err) {
      db.close();
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      resolve(req?.result);
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error || new Error('Tag storage transaction failed.'));
      db.close();
    };
    tx.onabort = () => {
      reject(tx.error || new Error('Tag storage transaction aborted.'));
      db.close();
    };
  });
}

const listAll = (store) =>
  withStore(store, 'readonly', (s) => s.getAll()).then((rows) => (Array.isArray(rows) ? rows : []));

export const listTags = () => listAll(TAGS);
export const saveTagRecord = (tag) => withStore(TAGS, 'readwrite', (s) => s.put(tag));
export const deleteTagRecord = (id) => withStore(TAGS, 'readwrite', (s) => s.delete(id));

export const listFonts = () => listAll(FONTS);
export const saveFontRecord = (font) => withStore(FONTS, 'readwrite', (s) => s.put(font));
export const deleteFontRecord = (id) => withStore(FONTS, 'readwrite', (s) => s.delete(id));
