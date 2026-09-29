import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, AlertTriangle, MoveHorizontal, ImagePlus, Eye, Columns2, Wand2, Images, Mountain } from 'lucide-react';
import clsx from 'clsx';
import ProcessingPanel from './ProcessingPanel.jsx';
import Filmstrip from './Filmstrip.jsx';
import { Spinner } from './Loader.jsx';
import { downloadDataUrl } from '../utils/download.js';
import { useComposite } from '../hooks/useComposite.js';
import { compositeToBlob } from '../tags/renderTags.js';
import { DEFAULT_FORMAT } from '../constants/index.js';

/** Width ÷ height of the stage frame per output format. */
const FORMAT_RATIO = { carsales: 3 / 2, landscape: 3 / 2, square: 1, portrait: 2 / 3 };

function MetaChips({ meta, tagCount }) {
  if (!meta) return null;
  const chips = [];
  if (meta.shotType) chips.push(meta.shotType);
  if (meta.size) chips.push(meta.size);
  if (meta.autoFramed) chips.push(`fill ${Math.round((meta.fill || 0) * 100)}%`);
  if (tagCount) chips.push(`${tagCount} tag${tagCount === 1 ? '' : 's'}`);
  if (!chips.length) return null;
  return (
    <span className="hidden truncate text-[11px] capitalize text-stone-500 dark:text-stone-400 md:inline">
      {chips.join(' · ')}
    </span>
  );
}

function EmptyState({ hasPhotos, onAddPhotos }) {
  const steps = [
    { icon: Images, label: 'Add the car photos' },
    { icon: Mountain, label: 'Pick a scene' },
    { icon: Wand2, label: 'Generate' },
  ];
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex max-w-md flex-col items-center text-center"
    >
      <p className="micro">AutoVision Studio</p>
      <h2 className="display mt-3 text-[44px] leading-[1.02] text-stone-900 dark:text-white sm:text-[52px]">
        {hasPhotos ? 'Ready when you are.' : 'Your showroom awaits.'}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        {hasPhotos
          ? 'Your photos are loaded. Choose a scene, then press Generate — finished adverts appear right here.'
          : 'Shoot the car anywhere. We place it in the scene, fix the light and the reflections, and frame it for Carsales.'}
      </p>
      {!hasPhotos && (
        <button type="button" onClick={onAddPhotos} className="btn-primary mt-7">
          <ImagePlus className="h-4 w-4" /> Add vehicle photos
        </button>
      )}
      <ol className="mt-9 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        {steps.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className="chip whitespace-nowrap">
              <Icon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
              {label}
            </span>
            {i < steps.length - 1 && <span className="hidden h-px w-4 bg-stone-300 dark:bg-white/15 sm:block" />}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

export default function CanvasStage({
  selected,
  results = [],
  isRunning,
  settled,
  total,
  format = DEFAULT_FORMAT,
  tags = [],
  tagCounts = {},
  onSelect,
  onAddPhotos,
  hasPhotos,
}) {
  const [view, setView] = useState('compare');
  const [saving, setSaving] = useState(false);
  const ratio = FORMAT_RATIO[format] || FORMAT_RATIO[DEFAULT_FORMAT];

  const showProcessing = isRunning && !selected;
  const isDone = selected?.status === 'done' && selected?.image;
  // The finished photo with its marketing tags drawn on (live while editing).
  const shown = useComposite(isDone ? selected.image : null, tags);
  // A render restored after its photo was removed has no "before" to compare.
  const canCompare = Boolean(selected?.originalUrl);
  const mode = canCompare ? view : 'after';

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
    // A definite height below lg: the frame is sized in container units (cqh),
    // which resolve to 0 inside an auto-height column — the photo vanished on phones.
    <section className="stage relative flex h-[72svh] min-h-[480px] flex-col overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
      {/* Floating toolbar */}
      {selected && (
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <div className="glass flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4">
            {selected.stock ? (
              <span className="shrink-0 rounded-full bg-ink-900 px-2.5 py-1 font-mono text-[11px] font-medium text-white dark:bg-white dark:text-ink-950">
                #{selected.stock}
              </span>
            ) : (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-white/10">
                {selected.status === 'pending' ? (
                  <Spinner size="xs" />
                ) : (
                  <Images className="h-3.5 w-3.5 text-stone-500" />
                )}
              </span>
            )}
            <span className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">{selected.name}</span>
            {isDone ? (
              <MetaChips meta={selected.meta} tagCount={tags.length} />
            ) : (
              <span className="text-[11px] text-stone-500">{selected.status === 'pending' ? 'Rendering…' : 'Failed'}</span>
            )}
          </div>

          {isDone && (
            <div className="glass flex shrink-0 items-center gap-1 rounded-full p-1">
              {canCompare &&
                [
                  { id: 'compare', icon: Columns2, label: 'Compare' },
                  { id: 'after', icon: Eye, label: 'Result' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-pressed={mode === id}
                    className={clsx(
                      'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
                      mode === id ? 'text-stone-900 dark:text-white' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                    )}
                  >
                    {mode === id && (
                      <motion.span
                        layoutId="view-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        className="absolute inset-0 rounded-full bg-white shadow-soft ring-1 ring-stone-200 dark:bg-white/10 dark:ring-white/10"
                      />
                    )}
                    <Icon className="relative h-3.5 w-3.5" />
                    <span className="relative hidden sm:inline">{label}</span>
                  </button>
                ))}
              <button type="button" onClick={download} disabled={saving} className="btn-primary h-8 px-3.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* The frame — sized with container units so it always fits, at the right ratio. */}
      <div
        className={clsx('flex flex-1 items-center justify-center px-4 sm:px-8 lg:min-h-0', selected ? 'pt-[68px]' : 'pt-6', results.length ? 'pb-[150px]' : 'pb-6')}
      >
        <div className="grid h-full w-full place-items-center" style={{ containerType: 'size' }}>
          <AnimatePresence mode="wait">
            {showProcessing ? (
              <ProcessingPanel key="processing" done={settled} total={total} />
            ) : !selected ? (
              <EmptyState hasPhotos={hasPhotos} onAddPhotos={onAddPhotos} />
            ) : (
              <motion.div
                key={selected.key}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.995 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5 dark:bg-ink-900 dark:ring-white/10"
                style={{ width: `min(100cqw, ${ratio * 100}cqh)`, aspectRatio: String(ratio) }}
              >
                {isDone ? (
                  mode === 'compare' ? (
                    <>
                      <ReactCompareSlider
                        itemOne={<ReactCompareSliderImage src={selected.originalUrl} alt="Original" />}
                        itemTwo={<ReactCompareSliderImage src={shown} alt="Enhanced" />}
                        className="h-full w-full"
                      />
                      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                        Before
                      </span>
                      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-900 backdrop-blur">
                        After
                      </span>
                      <span className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur sm:inline-flex">
                        <MoveHorizontal className="h-3.5 w-3.5" /> Drag to compare
                      </span>
                    </>
                  ) : (
                    <img src={shown} alt={selected.name} className="h-full w-full object-contain" />
                  )
                ) : selected.status === 'pending' ? (
                  <div className="relative h-full w-full overflow-hidden">
                    {selected.originalUrl && (
                      <img
                        src={selected.originalUrl}
                        alt={selected.name}
                        className="h-full w-full scale-105 object-cover opacity-50 blur-sm"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/60 dark:from-ink-950/70 dark:to-ink-950/70" />
                    <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-300/40 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Spinner size="lg" />
                      <span className="glass rounded-full px-3.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200">
                        Rendering this car…
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-red-50 px-6 text-center dark:bg-red-950/30">
                    <AlertTriangle className="h-7 w-7 text-red-500" />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn’t enhance this one</p>
                    <p className="max-w-md text-xs text-red-600 dark:text-red-400">{selected.error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {results.length > 0 && (
        <Filmstrip results={results} selectedKey={selected?.key} onSelect={onSelect} tagCounts={tagCounts} />
      )}
    </section>
  );
}
