import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, AlertTriangle, MoveHorizontal, ImagePlus, Eye, Columns2 } from 'lucide-react';
import clsx from 'clsx';
import ProcessingPanel from './ProcessingPanel.jsx';
import { Spinner } from './Loader.jsx';
import { downloadDataUrl } from '../utils/download.js';

/**
 * The stage: one large view of whichever result is selected, plus its own
 * toolbar. Falls back to an invitation when there is nothing to show, and to
 * the processing panel while the first image is still cooking.
 *
 * @param {object} props
 * @param {object|null} props.selected      the result being previewed
 * @param {boolean} props.isRunning
 * @param {number} props.settled            results that finished (done or failed)
 * @param {number} props.total              results requested
 * @param {() => void} props.onAddPhotos    focus the Photos section in the drawer
 */
export default function CanvasStage({ selected, isRunning, settled, total, onAddPhotos }) {
  /* 'compare' drags a slider between before and after; 'after' shows the
     finished image alone, which is what dealers actually hand over. */
  const [view, setView] = useState('compare');

  const showProcessing = isRunning && !selected;
  const isDone = selected?.status === 'done' && selected?.image;

  return (
    <section className="stage flex min-h-[420px] flex-1 flex-col overflow-hidden lg:min-h-0">
      {/* Stage toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-brand-100/70 bg-white/50 px-4 backdrop-blur">
        <div className="min-w-0">
          {selected ? (
            <>
              <p className="truncate text-sm font-bold text-slate-800">{selected.name}</p>
              <p className="micro mt-0.5">
                {selected.meta?.size || (selected.status === 'pending' ? 'Generating…' : 'Failed')}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800">Stage</p>
              <p className="micro mt-0.5">Nothing selected</p>
            </>
          )}
        </div>

        {isDone && (
          <div className="flex shrink-0 items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-xl border border-brand-100 bg-white p-0.5">
              {[
                { id: 'compare', icon: Columns2, label: 'Compare' },
                { id: 'after', icon: Eye, label: 'Result' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition',
                    view === id
                      ? 'bg-brand-gradient text-white shadow-glow'
                      : 'text-slate-500 hover:text-brand-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                downloadDataUrl(
                  selected.image,
                  `enhanced-${selected.name.replace(/\.[^.]+$/, '')}.png`
                )
              }
              className="btn-primary px-3.5 py-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          </div>
        )}
      </div>

      {/* Stage body */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-5 sm:p-8">
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
                <span className="relative grid h-20 w-20 place-items-center rounded-3xl border border-brand-100 bg-white shadow-card">
                  <ImagePlus className="h-9 w-9 text-brand-500" />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Your stage is empty
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
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
              <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-brand-100">
                {isDone ? (
                  <div className="relative aspect-[3/2]">
                    {view === 'compare' ? (
                      <>
                        <ReactCompareSlider
                          itemOne={
                            <ReactCompareSliderImage src={selected.originalUrl} alt="Original" />
                          }
                          itemTwo={<ReactCompareSliderImage src={selected.image} alt="Enhanced" />}
                          className="h-full w-full"
                        />
                        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur">
                          Before
                        </span>
                        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          After
                        </span>
                        <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-soft backdrop-blur">
                          <MoveHorizontal className="h-3.5 w-3.5" /> Drag to compare
                        </span>
                      </>
                    ) : (
                      <img
                        src={selected.image}
                        alt={selected.name}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                ) : selected.status === 'pending' ? (
                  /* The source photo, dimmed with a blue bar sweeping down it —
                     a minute of dead air needs to look like work, not a hang. */
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <img
                      src={selected.originalUrl}
                      alt={selected.name}
                      className="h-full w-full scale-105 object-cover opacity-40 blur-sm"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white/70" />
                    <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-400/40 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Spinner size="lg" />
                      <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft backdrop-blur">
                        Enhancing…
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[3/2] flex-col items-center justify-center gap-2 bg-red-50 px-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-bold text-red-700">Couldn’t enhance this one</p>
                    <p className="max-w-md text-xs text-red-600">{selected.error}</p>
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
