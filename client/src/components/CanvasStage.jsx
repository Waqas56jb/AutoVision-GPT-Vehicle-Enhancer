import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, AlertTriangle, MoveHorizontal, ImagePlus, Eye, Columns2 } from 'lucide-react';
import clsx from 'clsx';
import ProcessingPanel from './ProcessingPanel.jsx';
import { Spinner } from './Loader.jsx';
import { downloadDataUrl } from '../utils/download.js';
import { useComposite } from '../hooks/useComposite.js';
import { compositeToBlob } from '../tags/renderTags.js';
import { FORMAT_ASPECT, DEFAULT_FORMAT } from '../constants/index.js';

function MetaChips({ meta, tagCount }) {
  if (!meta) return null;
  const chips = [];
  if (meta.shotType) chips.push(meta.shotType);
  if (meta.size) chips.push(meta.size);
  if (meta.autoFramed) chips.push(`fill ${Math.round((meta.fill || 0) * 100)}%`);
  if (tagCount) chips.push(`${tagCount} tag${tagCount === 1 ? '' : 's'}`);
  if (!chips.length) return null;
  return <p className="micro mt-0.5 truncate normal-case tracking-normal">{chips.join(' · ')}</p>;
}

export default function CanvasStage({
  selected,
  isRunning,
  settled,
  total,
  format = DEFAULT_FORMAT,
  tags = [],
  onAddPhotos,
}) {
  const [view, setView] = useState('compare');
  const [saving, setSaving] = useState(false);
  const aspect = FORMAT_ASPECT[format] || FORMAT_ASPECT[DEFAULT_FORMAT];

  const showProcessing = isRunning && !selected;
  const isDone = selected?.status === 'done' && selected?.image;
  // The finished photo with its marketing tags drawn on (live while editing).
  const shown = useComposite(isDone ? selected.image : null, tags);

  const download = async () => {
    const name = `${selected.downloadName || `enhanced-${selected.name.replace(/\.[^.]+$/, '')}`}.png`;
    if (!tags.length) {
      downloadDataUrl(selected.image, name);
      return;
    }
    setSaving(true);
    try {
      // Full resolution, lossless — the preview on screen is only a JPEG proxy.
      const url = URL.createObjectURL(await compositeToBlob(selected.image, tags));
      downloadDataUrl(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stage flex min-h-[420px] flex-1 flex-col overflow-hidden lg:min-h-0">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-brand-100/70 bg-white/50 px-4 backdrop-blur dark:border-white/10 dark:bg-ink-900/40">
        <div className="min-w-0">
          {selected ? (
            <>
              <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {selected.stock && (
                  <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                    #{selected.stock}
                  </span>
                )}
                <span className="truncate">{selected.name}</span>
              </p>
              {isDone ? (
                <MetaChips meta={selected.meta} tagCount={tags.length} />
              ) : (
                <p className="micro mt-0.5">
                  {selected.status === 'pending' ? 'Generating…' : 'Failed'}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Stage</p>
              <p className="micro mt-0.5">Nothing selected</p>
            </>
          )}
        </div>

        {isDone && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-xl border border-brand-100 bg-white p-0.5 dark:border-white/10 dark:bg-ink-800">
              {[
                { id: 'compare', icon: Columns2, label: 'Compare' },
                { id: 'after', icon: Eye, label: 'Result' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                    view === id
                      ? 'bg-brand-gradient text-white shadow-glow'
                      : 'text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={download}
              disabled={saving}
              className="btn-primary h-9 px-3.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {showProcessing ? (
            <ProcessingPanel key="processing" done={settled} total={total} />
          ) : !selected ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-5">
                <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-400/30" />
                <span className="relative grid h-20 w-20 place-items-center rounded-3xl border border-brand-100 bg-white shadow-card dark:border-white/10 dark:bg-ink-800">
                  <ImagePlus className="h-9 w-9 text-brand-500" />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Your stage is empty
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Add vehicle photos, choose a background and paint colour, then hit Generate. The
                finished advert lands right here.
              </p>
              <button type="button" onClick={onAddPhotos} className="btn-primary mt-6">
                <ImagePlus className="h-4 w-4" /> Add vehicle photos
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={selected.key}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-full w-full items-center justify-center"
            >
              <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-brand-100 dark:bg-ink-900 dark:ring-white/10">
                {isDone ? (
                  <div className={clsx('relative', aspect)}>
                    {view === 'compare' ? (
                      <>
                        <ReactCompareSlider
                          itemOne={
                            <ReactCompareSliderImage src={selected.originalUrl} alt="Original" />
                          }
                          itemTwo={<ReactCompareSliderImage src={shown} alt="Enhanced" />}
                          className="h-full w-full"
                        />
                        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur dark:bg-ink-950/80 dark:text-slate-200">
                          Before
                        </span>
                        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          After
                        </span>
                        <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-soft backdrop-blur dark:bg-ink-950/80 dark:text-slate-200">
                          <MoveHorizontal className="h-3.5 w-3.5" /> Drag to compare
                        </span>
                      </>
                    ) : (
                      <img
                        src={shown}
                        alt={selected.name}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                ) : selected.status === 'pending' ? (
                  <div className={clsx('relative overflow-hidden', aspect)}>
                    <img
                      src={selected.originalUrl}
                      alt={selected.name}
                      className="h-full w-full scale-105 object-cover opacity-40 blur-sm"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white/70 dark:from-ink-950/70 dark:to-ink-950/70" />
                    <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-400/40 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Spinner size="lg" />
                      <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft backdrop-blur dark:bg-ink-900/90 dark:text-brand-200">
                        Enhancing…
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={clsx(
                      'flex flex-col items-center justify-center gap-2 bg-red-50 px-6 text-center dark:bg-red-950/40',
                      aspect
                    )}
                  >
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">
                      Couldn’t enhance this one
                    </p>
                    <p className="max-w-md text-xs text-red-600 dark:text-red-400">{selected.error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
