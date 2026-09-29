import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createTag, normaliseTag } from '../tags/tagModel.js';
import {
  listTags,
  saveTagRecord,
  deleteTagRecord,
  listFonts,
  saveFontRecord,
  deleteFontRecord,
} from '../tags/tagStorage.js';
import { fileToFontRecord, registerFont } from '../tags/assets.js';
import { downloadDataUrl } from '../utils/download.js';

const EXPORT_KIND = 'autovision-tag-library';

/**
 * The saved tag library (and uploaded fonts), persisted on this device.
 *
 * Storage failures (private mode, blocked site data) degrade to an in-memory
 * library for the session — tagging still works, it just is not remembered.
 * Export/import moves the whole library as one JSON file between devices.
 */
export function useTagLibrary() {
  const [tags, setTags] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [savedTags, savedFonts] = await Promise.all([
        listTags().catch(() => []),
        listFonts().catch(() => []),
      ]);
      const okFonts = [];
      for (const f of savedFonts) {
        try {
          await registerFont(f);
          okFonts.push(f);
        } catch {
          /* skip a font the browser can no longer read */
        }
      }
      if (!alive) return;
      setFonts(okFonts.sort((a, b) => a.createdAt - b.createdAt));
      setTags(savedTags.map(normaliseTag).sort((a, b) => a.createdAt - b.createdAt));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = (promise) =>
    promise.catch(() =>
      toast.error('Could not save to this browser — the change lasts until you close the tab.', {
        id: 'tag-storage',
      })
    );

  const saveTag = useCallback((tag) => {
    const clean = normaliseTag({ ...tag, updatedAt: Date.now() });
    setTags((prev) => {
      const i = prev.findIndex((t) => t.id === clean.id);
      if (i === -1) return [...prev, clean];
      const next = prev.slice();
      next[i] = clean;
      return next;
    });
    persist(saveTagRecord(clean));
    return clean;
  }, []);

  const removeTag = useCallback((id) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    persist(deleteTagRecord(id));
  }, []);

  const duplicateTag = useCallback(
    (tag) =>
      saveTag(
        createTag({
          ...tag,
          id: undefined,
          name: `${tag.name} (copy)`.slice(0, 60),
          createdAt: Date.now(),
        })
      ),
    [saveTag]
  );

  const addFont = useCallback(async (file) => {
    const rec = await fileToFontRecord(file);
    setFonts((prev) => [...prev, rec]);
    persist(saveFontRecord(rec));
    return rec;
  }, []);

  const removeFont = useCallback((id) => {
    setFonts((prev) => prev.filter((f) => f.id !== id));
    persist(deleteFontRecord(id));
  }, []);

  const exportLibrary = useCallback(() => {
    const payload = { kind: EXPORT_KIND, version: 1, exportedAt: new Date().toISOString(), tags, fonts };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, 'autovision-tags.json');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [tags, fonts]);

  /** Merge a previously exported library. Same id → replaced, new id → added. */
  const importLibrary = useCallback(async (file) => {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('That file is not a tag library export.');
    }
    if (data?.kind !== EXPORT_KIND || !Array.isArray(data.tags)) {
      throw new Error('That file is not a tag library export.');
    }

    const inFonts = Array.isArray(data.fonts) ? data.fonts : [];
    const goodFonts = [];
    for (const f of inFonts) {
      if (!f?.id || !f?.family || typeof f.dataUrl !== 'string') continue;
      try {
        await registerFont(f);
        goodFonts.push({ id: f.id, label: String(f.label || 'Custom font'), family: f.family, dataUrl: f.dataUrl, createdAt: Number(f.createdAt) || Date.now() });
      } catch {
        /* skip unreadable font */
      }
    }
    const inTags = data.tags.map(normaliseTag);

    setFonts((prev) => [...prev.filter((f) => !goodFonts.some((g) => g.id === f.id)), ...goodFonts]);
    setTags((prev) => [...prev.filter((t) => !inTags.some((n) => n.id === t.id)), ...inTags]);
    goodFonts.forEach((f) => persist(saveFontRecord(f)));
    inTags.forEach((t) => persist(saveTagRecord(t)));
    return inTags.length;
  }, []);

  return {
    ready,
    tags,
    fonts,
    saveTag,
    removeTag,
    duplicateTag,
    addFont,
    removeFont,
    exportLibrary,
    importLibrary,
  };
}

export default useTagLibrary;
