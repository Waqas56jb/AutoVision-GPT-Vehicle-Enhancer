import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Images, Mountain, Palette, BadgeCheck, Wand2, Loader2, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import StudioRail from './StudioRail.jsx';
import MultiImageDropzone from './MultiImageDropzone.jsx';
import BackgroundManager from './BackgroundManager.jsx';
import ColorPicker from './ColorPicker.jsx';
import TagLibrary from './tags/TagLibrary.jsx';
import CanvasStage from './CanvasStage.jsx';
import Filmstrip from './Filmstrip.jsx';
import Inspector from './Inspector.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { ProgressBar } from './Loader.jsx';
import { useProcess } from '../hooks/useProcess.js';
import { useTheme } from '../hooks/useTheme.jsx';
import { useTagLibrary } from '../hooks/useTagLibrary.js';
import { createTag, ruleApplies, tagsForResult } from '../tags/tagModel.js';
import { compositeToBlob } from '../tags/renderTags.js';
import { downloadDataUrl } from '../utils/download.js';
import { downloadZip } from '../utils/zip.js';
import { getPref, setPref } from '../utils/prefs.js';
import {
  APP_NAME,
  DEFAULT_FRAMING,
  DEFAULT_FORMAT,
  FRAMING_OPTIONS,
  FORMAT_OPTIONS,
} from '../constants/index.js';

function readPref(key, fallback, allowed) {
  const v = getPref(key, fallback);
  return allowed.includes(v) ? v : fallback;
}

/**
 * The workbench. Four panes: a navy tool rail, an inputs drawer, the stage
 * (one big preview + a filmstrip of the batch), and an output inspector.
 * The rail switches which input section the drawer shows.
 */
export default function Studio() {
  const { isDark, toggleTheme } = useTheme();
  const [section, setSection] = useState('photos');

  const [vehicles, setVehicles] = useState([]);
  const [stocks, setStocks] = useState({}); // stock number by fileKey
  const [background, setBackgroundState] = useState(() => getPref('background', 'studio'));
  const [colors, setColors] = useState([]); // optional recolour targets
  const [framing, setFramingState] = useState(() =>
    readPref('framing', DEFAULT_FRAMING, FRAMING_OPTIONS.map((o) => o.value))
  );
  const [format, setFormatState] = useState(() =>
    readPref('format', DEFAULT_FORMAT, FORMAT_OPTIONS.map((o) => o.value))
  );
  const [notes, setNotes] = useState('');
  const library = useTagLibrary(); // saved marketing tags (this device)
  const [overrides, setOverrides] = useState({}); // per-photo tag switches: {resultKey: {tagId: bool}}
  const [editing, setEditing] = useState(null); // {draft, isNew} while a tag is being edited

  const [pickedKey, setPickedKey] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'reset' | 'generate' | null

  const { isRunning, results, run, reset } = useProcess();

  const doneCount = results.filter((r) => r.status === 'done').length;
  const settledCount = results.filter((r) => r.status !== 'pending').length;
  const jobCount = vehicles.length * (colors.length || 1);

  const setBackground = useCallback((v) => {
    setBackgroundState(v);
    setPref('background', v);
  }, []);

  const setFraming = useCallback((v) => {
    setFramingState(v);
    setPref('framing', v);
  }, []);

  const setFormat = useCallback((v) => {
    setFormatState(v);
    setPref('format', v);
  }, []);

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

  const SECTIONS = [
    { id: 'photos', label: 'Vehicle photos', icon: Images, badge: vehicles.length },
    { id: 'background', label: 'Background', icon: Mountain },
    { id: 'colour', label: 'Paint colour', icon: Palette, badge: colors.length },
    { id: 'tag', label: 'Marketing tags', icon: BadgeCheck, badge: library.tags.length },
  ];
  const activeSection = SECTIONS.find((s) => s.id === section);

  const handleReset = () => {
    reset();
    setVehicles([]);
    setStocks({});
    setBackground('studio');
    setColors([]);
    setFraming(DEFAULT_FRAMING);
    setFormat(DEFAULT_FORMAT);
    setNotes('');
    setOverrides({});
    setEditing(null);
    setPickedKey(null);
    setSection('photos');
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

  return (
    <div className="flex min-h-full flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      <StudioRail sections={SECTIONS} active={section} onSelect={setSection} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-white/80 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/80 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              {APP_NAME}
              <span className="ml-2 hidden rounded-md bg-brand-50 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 sm:inline">
                Studio
              </span>
            </h1>
            <p className="micro mt-0.5 truncate">
              {vehicles.length
                ? `${vehicles.length} photo${vehicles.length === 1 ? '' : 's'}${
                    colors.length ? ` · ${colors.length} colour${colors.length === 1 ? '' : 's'}` : ''
                  } · ${jobCount} image${jobCount === 1 ? '' : 's'} to render`
                : 'No vehicles loaded'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-ghost h-10 w-10 px-0"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Light theme' : 'Dark theme'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isRunning || vehicles.length === 0}
              className="btn-primary shrink-0 px-4 sm:px-5"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isRunning ? 'Generating…' : `Generate${jobCount ? ` ${jobCount}` : ''}`}
              </span>
            </button>
          </div>

          {isRunning && (
            <ProgressBar
              value={results.length ? (settledCount / results.length) * 100 : 0}
              className="absolute inset-x-0 bottom-0 h-1 rounded-none"
            />
          )}
        </header>

        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          <aside className="pane flex w-full shrink-0 flex-col border-b lg:h-full lg:w-[340px] lg:border-b-0 lg:border-r">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-100 px-4 dark:border-white/10">
              {activeSection && <activeSection.icon className="h-4 w-4 text-brand-600" />}
              <AnimatePresence mode="wait">
                <motion.h2
                  key={section}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white"
                >
                  {activeSection?.label}
                </motion.h2>
              </AnimatePresence>
            </header>

            <div className="flex-1 overflow-y-auto p-4 lg:min-h-0">
              <div className={clsx(section !== 'photos' && 'hidden')}>
                <MultiImageDropzone
                  files={vehicles}
                  onChange={setVehicles}
                  stocks={stocks}
                  onStockChange={(key, value) =>
                    setStocks((prev) => ({ ...prev, [key]: value }))
                  }
                  disabled={isRunning}
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

          <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
            <CanvasStage
              selected={selected}
              isRunning={isRunning}
              settled={settledCount}
              total={results.length}
              format={format}
              tags={stageTags}
              onAddPhotos={() => setSection('photos')}
            />
            <Filmstrip
              results={results}
              selectedKey={selected?.key}
              onSelect={setPickedKey}
              tagCounts={tagCounts}
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
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Start over?"
        message="This clears the current batch, photos and output settings. Saved backgrounds and tags on this device are kept."
        confirmLabel="Start over"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          handleReset();
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
