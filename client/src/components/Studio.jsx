import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Images, Mountain, Palette, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import TopBar from './TopBar.jsx';
import MultiImageDropzone from './MultiImageDropzone.jsx';
import BackgroundManager from './BackgroundManager.jsx';
import ColorPicker from './ColorPicker.jsx';
import TagLibrary from './tags/TagLibrary.jsx';
import CanvasStage from './CanvasStage.jsx';
import Inspector from './Inspector.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { useProcess } from '../hooks/useProcess.js';
import { useTheme } from '../hooks/useTheme.jsx';
import { useTagLibrary } from '../hooks/useTagLibrary.js';
import { createTag, ruleApplies, tagsForResult } from '../tags/tagModel.js';
import { compositeToBlob } from '../tags/renderTags.js';
import { downloadDataUrl } from '../utils/download.js';
import { downloadZip } from '../utils/zip.js';
import { getPref, setPref } from '../utils/prefs.js';
import { savePhoto, deletePhoto, clearPhotos, loadPhotos, loadResults } from '../utils/workspaceStorage.js';
import {
  DEFAULT_FRAMING,
  DEFAULT_FORMAT,
  FRAMING_OPTIONS,
  FORMAT_OPTIONS,
  fileKey,
} from '../constants/index.js';

function readPref(key, fallback, allowed) {
  const v = getPref(key, fallback);
  return allowed.includes(v) ? v : fallback;
}

const STEP_COPY = {
  photos: {
    title: 'Vehicle photos',
    blurb: 'Upload one car or the whole lot. Add a stock number and each file is named after it.',
  },
  background: {
    title: 'The scene',
    blurb: 'Choose where every car is photographed. Your uploads are kept on this device.',
  },
  colour: {
    title: 'Paint colour',
    blurb: 'Optional — render the same car in other factory colours.',
  },
  tag: {
    title: 'Marketing tags',
    blurb: 'Warranty tags, headers and footers laid over the finished photos.',
  },
};

/**
 * The studio. A top bar carries the brand, the four workflow steps and the
 * Generate action; below it three floating panels sit on the canvas: the step
 * panel (inputs), the stage (preview + filmstrip dock) and the inspector.
 *
 * Everything the operator uploads or renders is persisted in IndexedDB and
 * restored on load — nothing is lost on refresh. Only explicit, confirmed
 * actions remove photos, renders or backgrounds.
 */
export default function Studio() {
  const { isDark, toggleTheme } = useTheme();
  const [section, setSection] = useState('photos');

  const [vehicles, setVehiclesState] = useState([]);
  const [stocks, setStocksState] = useState(() => getPref('stocks', {})); // stock number by fileKey
  const [background, setBackgroundState] = useState(() => getPref('background', 'studio'));
  const [colors, setColorsState] = useState(() => getPref('colors', [])); // optional recolour targets
  const [framing, setFramingState] = useState(() =>
    readPref('framing', DEFAULT_FRAMING, FRAMING_OPTIONS.map((o) => o.value))
  );
  const [format, setFormatState] = useState(() =>
    readPref('format', DEFAULT_FORMAT, FORMAT_OPTIONS.map((o) => o.value))
  );
  const [notes, setNotesState] = useState(() => getPref('notes', ''));
  const library = useTagLibrary(); // saved marketing tags (this device)
  const [overrides, setOverridesState] = useState(() => getPref('tagOverrides', {})); // {resultKey: {tagId: bool}}
  const [editing, setEditing] = useState(null); // {draft, isNew} while a tag is being edited

  const [pickedKey, setPickedKey] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'reset' | 'generate' | 'clearPhotos' | null
  const [hydrated, setHydrated] = useState(false);
  // Saved sort position of each photo, so an Undo puts it back where it was.
  const photoOrder = useRef(new Map());

  const { isRunning, results: rawResults, run, reset, restore } = useProcess();

  /* ── Persistence ─────────────────────────────────────────── */

  const persistPref = (setter, key) => (v) =>
    setter((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      setPref(key, next);
      return next;
    });
  /* eslint-disable react-hooks/exhaustive-deps */
  const setStocks = useCallback(persistPref(setStocksState, 'stocks'), []);
  const setColors = useCallback(persistPref(setColorsState, 'colors'), []);
  const setNotes = useCallback(persistPref(setNotesState, 'notes'), []);
  const setOverrides = useCallback(persistPref(setOverridesState, 'tagOverrides'), []);
  const setBackground = useCallback(persistPref(setBackgroundState, 'background'), []);
  const setFraming = useCallback(persistPref(setFramingState, 'framing'), []);
  const setFormat = useCallback(persistPref(setFormatState, 'format'), []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Restore photos and renders saved by an earlier session.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [photos, saved] = await Promise.all([
        loadPhotos().catch(() => []),
        loadResults().catch(() => []),
      ]);
      if (!alive) return;
      photos.forEach(({ file, order }) => photoOrder.current.set(fileKey(file), order));
      const files = photos.map((p) => p.file);
      setVehiclesState(files);
      const byKey = new Map(files.map((f) => [fileKey(f), f]));
      if (saved.length) restore(saved, (k) => byKey.get(k));
      setHydrated(true);
      if (photos.length || saved.length) {
        toast.success(
          `Restored ${photos.length} photo${photos.length === 1 ? '' : 's'}${
            saved.length ? ` and ${saved.length} render${saved.length === 1 ? '' : 's'}` : ''
          }.`,
          { id: 'restored' }
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [restore]);

  const storageError = () =>
    toast.error('This browser could not save the photo — it will be gone after a refresh.', { id: 'photo-storage' });

  /** Adding photos: keep what is there, append the new ones, persist them. */
  const addPhotos = useCallback((files) => {
    setVehiclesState((prev) => {
      const have = new Set(prev.map(fileKey));
      const fresh = files.filter((f) => !have.has(fileKey(f)));
      const base = Date.now();
      fresh.forEach((f, i) => {
        photoOrder.current.set(fileKey(f), base + i);
        savePhoto({ id: fileKey(f), file: f, order: base + i }).catch(storageError);
      });
      return [...prev, ...fresh];
    });
  }, []);

  /** Removing one photo is immediate, with an Undo that puts it back in place. */
  const removePhoto = useCallback((file) => {
    const id = fileKey(file);
    let index = -1;
    setVehiclesState((prev) => {
      index = prev.findIndex((f) => fileKey(f) === id);
      return prev.filter((f) => fileKey(f) !== id);
    });
    deletePhoto(id).catch(() => {});
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          Photo removed
          <button
            type="button"
            className="rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-ink-950"
            onClick={() => {
              toast.dismiss(t.id);
              setVehiclesState((prev) => {
                if (prev.some((f) => fileKey(f) === id)) return prev;
                const next = prev.slice();
                next.splice(Math.max(0, Math.min(index, next.length)), 0, file);
                return next;
              });
              savePhoto({ id, file, order: photoOrder.current.get(id) ?? Date.now() }).catch(storageError);
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 6000, id: `removed-${id}` }
    );
  }, []);

  const removeAllPhotos = () => {
    setVehiclesState([]);
    clearPhotos().catch(() => {});
  };

  /* ── Derived state ───────────────────────────────────────── */

  // "First photo" and similar rules follow the CURRENT photo order.
  const results = useMemo(() => {
    const pos = new Map(vehicles.map((f, i) => [fileKey(f), i]));
    return rawResults.map((r) => ({ ...r, vIndex: r.fileKey && pos.has(r.fileKey) ? pos.get(r.fileKey) : -1 }));
  }, [rawResults, vehicles]);

  const doneCount = results.filter((r) => r.status === 'done').length;
  const pendingInRun = results.filter((r) => r.status === 'pending').length;
  const jobCount = vehicles.length * (colors.length || 1);

  /* Whatever the user clicked, else the first finished image, else the first
     job — so the stage fills itself as results stream in, with no effect. */
  const selected = useMemo(
    () =>
      results.find((r) => r.key === pickedKey) ??
      results.find((r) => r.status === 'done') ??
      results[0] ??
      null,
    [results, pickedKey]
  );

  const tagsFor = useCallback(
    (r) => tagsForResult(library.tags, r, overrides),
    [library.tags, overrides]
  );

  /* The stage shows the photo's tags — and, while a tag is being edited, the
     live draft in its place (even if its rule would skip this photo), so every
     change is visible full size as it is made. */
  const stageTags = useMemo(() => {
    if (!selected) return [];
    if (!editing) return tagsFor(selected);
    const { draft } = editing;
    const own = overrides[selected.key] || {};
    const list = library.tags
      .map((t) => (t.id === draft.id ? draft : t))
      .filter((t) => t.id === draft.id || (t.id in own ? own[t.id] : ruleApplies(t, selected)));
    return list.some((t) => t.id === draft.id) ? list : [...list, draft];
  }, [selected, editing, library.tags, overrides, tagsFor]);

  const tagCounts = useMemo(
    () => Object.fromEntries(results.map((r) => [r.key, tagsFor(r).length])),
    [results, tagsFor]
  );

  /* ── Tags ────────────────────────────────────────────────── */

  const openEditor = (tag) => {
    setEditing(tag ? { draft: { ...tag }, isNew: false } : { draft: createTag(), isNew: true });
    setSection('tag');
  };

  const saveEditing = () => {
    if (!editing) return;
    const before = library.tags.find((t) => t.id === editing.draft.id);
    const saved = library.saveTag(editing.draft);
    setOverrides((prev) => {
      let next = prev;
      // A changed rule means "apply it like this now" — drop old per-photo switches.
      if (before && before.applyTo !== saved.applyTo) {
        next = Object.fromEntries(
          Object.entries(prev).map(([k, v]) => {
            const { [saved.id]: _drop, ...rest } = v;
            return [k, rest];
          })
        );
      }
      // A new hand-picked tag starts on the photo it was designed against.
      if (editing.isNew && saved.applyTo === 'manual' && selected) {
        next = { ...next, [selected.key]: { ...(next[selected.key] || {}), [saved.id]: true } };
      }
      return next;
    });
    setEditing(null);
    toast.success(editing.isNew ? 'Tag saved.' : 'Tag updated.');
  };

  const togglePhotoTag = (tagId, value) => {
    if (!selected) return;
    setOverrides((prev) => ({ ...prev, [selected.key]: { ...(prev[selected.key] || {}), [tagId]: value } }));
  };

  const resetPhotoTags = () => {
    if (!selected) return;
    setOverrides(({ [selected.key]: _drop, ...rest }) => rest);
  };

  /* ── Actions ─────────────────────────────────────────────── */

  const SECTIONS = [
    { id: 'photos', label: 'Photos', icon: Images, badge: vehicles.length },
    { id: 'background', label: 'Scene', icon: Mountain },
    { id: 'colour', label: 'Paint', icon: Palette, badge: colors.length },
    { id: 'tag', label: 'Tags', icon: BadgeCheck, badge: library.tags.length },
  ];
  const stepIndex = SECTIONS.findIndex((s) => s.id === section);
  const copy = STEP_COPY[section];

  /** Clears RENDERS only. Photos, backgrounds, tags and settings are kept. */
  const clearAllResults = () => {
    reset();
    setOverrides({});
    setPickedKey(null);
  };

  const startGenerate = () => {
    setPickedKey(null);
    run({ vehicles, background, colors, framing, format, notes, stocks });
  };

  const handleGenerate = () => {
    if (jobCount >= 20) {
      setConfirm('generate');
      return;
    }
    startGenerate();
  };

  const downloadAll = async () => {
    const done = results.filter((r) => r.status === 'done' && r.image);
    if (!done.length) return;
    const toastId = toast.loading(`Preparing ${done.length} image${done.length === 1 ? '' : 's'}…`);
    try {
      // One at a time: 100 full-size canvases at once would exhaust memory.
      const entries = [];
      for (const r of done) {
        const tags = tagsFor(r);
        entries.push({
          name: r.downloadName || r.name,
          ...(tags.length ? { blob: await compositeToBlob(r.image, tags) } : { dataUrl: r.image }),
        });
      }
      await downloadZip(entries, 'autovision-images.zip');
      toast.success('Download started.', { id: toastId });
    } catch {
      toast.error('Could not build the ZIP — downloading photos one by one.', { id: toastId });
      done.forEach((r, i) =>
        setTimeout(() => downloadDataUrl(r.image, `${r.downloadName || r.name}.png`), i * 250)
      );
    }
  };

  const summary = vehicles.length
    ? `${vehicles.length} photo${vehicles.length === 1 ? '' : 's'}${
        colors.length ? ` · ${colors.length} colour${colors.length === 1 ? '' : 's'}` : ''
      }${doneCount ? ` · ${doneCount} ready` : ''}`
    : 'Dealership photography, finished';

  // Keep a stable ref for panels that scroll back to top on step change.
  const panelRef = useRef(null);
  useEffect(() => {
    panelRef.current?.scrollTo?.({ top: 0 });
  }, [section]);

  return (
    <div className="app-canvas flex min-h-full flex-col lg:h-screen lg:overflow-hidden">
      <TopBar
        sections={SECTIONS}
        active={section}
        onSelect={setSection}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onGenerate={handleGenerate}
        canGenerate={hydrated && !isRunning && vehicles.length > 0}
        isRunning={isRunning}
        jobCount={jobCount}
        progress={results.length ? ((results.length - pendingInRun) / results.length) * 100 : 0}
        summary={summary}
      />

      <div className="flex flex-1 flex-col gap-3 p-3 sm:px-4 sm:pb-4 lg:min-h-0 lg:flex-row">
        {/* Step panel */}
        <aside className="pane flex w-full shrink-0 flex-col overflow-hidden lg:h-full lg:w-[360px]">
          <div className="shrink-0 px-5 pb-4 pt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="micro">
                  Step {stepIndex + 1} of {SECTIONS.length}
                </p>
                <h2 className="display mt-1 text-[30px] leading-none text-stone-900 dark:text-white">
                  {copy.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                  {copy.blurb}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mx-5 h-px shrink-0 bg-stone-200/80 dark:bg-white/[0.07]" />

          <div ref={panelRef} className="flex-1 overflow-y-auto px-5 py-4 lg:min-h-0">
            <div className={clsx(section !== 'photos' && 'hidden')}>
              <MultiImageDropzone
                files={vehicles}
                onAdd={addPhotos}
                onRemove={removePhoto}
                onClearAll={() => setConfirm('clearPhotos')}
                stocks={stocks}
                onStockChange={(key, value) => setStocks((prev) => ({ ...prev, [key]: value }))}
                disabled={isRunning || !hydrated}
              />
            </div>
            <div className={clsx(section !== 'background' && 'hidden')}>
              <BackgroundManager value={background} onChange={setBackground} disabled={isRunning} />
            </div>
            <div className={clsx(section !== 'colour' && 'hidden')}>
              <ColorPicker value={colors} onChange={setColors} disabled={isRunning} />
            </div>
            <div className={clsx(section !== 'tag' && 'hidden')}>
              <TagLibrary
                library={library}
                editing={editing}
                onNew={() => openEditor(null)}
                onEdit={openEditor}
                onDraftChange={(next) =>
                  setEditing((e) =>
                    e ? { ...e, draft: typeof next === 'function' ? next(e.draft) : next } : e
                  )
                }
                onSave={saveEditing}
                onCancel={() => setEditing(null)}
                previewSrc={selected?.status === 'done' ? selected.image : null}
              />
            </div>
          </div>
        </aside>

        {/* Stage */}
        <main className="pane flex min-w-0 flex-col overflow-hidden lg:min-h-0 lg:flex-1">
          <CanvasStage
            selected={selected}
            results={results}
            isRunning={isRunning}
            settled={results.length - pendingInRun}
            total={results.length}
            format={format}
            tags={stageTags}
            tagCounts={tagCounts}
            onSelect={setPickedKey}
            onAddPhotos={() => setSection('photos')}
            hasPhotos={vehicles.length > 0}
          />
        </main>

        <Inspector
          framing={framing}
          onFraming={setFraming}
          format={format}
          onFormat={setFormat}
          notes={notes}
          onNotes={setNotes}
          disabled={isRunning}
          doneCount={doneCount}
          hasResults={results.length > 0}
          onDownloadAll={downloadAll}
          onReset={() => setConfirm('reset')}
          photoTags={{
            tags: library.tags,
            selected,
            overrides,
            onToggle: togglePhotoTag,
            onReset: resetPhotoTags,
            onEdit: openEditor,
            onCreate: () => openEditor(null),
          }}
        />
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Clear all renders?"
        message="The finished images are removed from this device. Your photos, backgrounds, tags and settings are kept, so you can render again."
        confirmLabel="Clear renders"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          clearAllResults();
        }}
      />
      <ConfirmDialog
        open={confirm === 'clearPhotos'}
        title={`Remove all ${vehicles.length} photos?`}
        message="They are deleted from this device. Finished renders stay until you clear them."
        confirmLabel="Remove photos"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          removeAllPhotos();
        }}
      />
      <ConfirmDialog
        open={confirm === 'generate'}
        title={`Render ${jobCount} images?`}
        message="Each image is a paid OpenAI render and takes about a minute. Large batches cannot be cancelled except by closing the tab."
        confirmLabel={`Generate ${jobCount}`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          startGenerate();
        }}
      />
    </div>
  );
}
