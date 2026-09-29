import { motion } from 'framer-motion';
import { AlertTriangle, BadgeCheck, Check } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from './Loader.jsx';

/**
 * The render dock floating at the foot of the stage — every job in the batch
 * (and earlier renders, which are kept). Clicking a frame puts it on the stage.
 *
 * @param {object} props
 * @param {object[]} props.results
 * @param {string} props.selectedKey
 * @param {(key:string)=>void} props.onSelect
 * @param {Record<string, number>} [props.tagCounts]
 */
export default function Filmstrip({ results, selectedKey, onSelect, tagCounts = {} }) {
  if (!results.length) return null;

  const doneCount = results.filter((r) => r.status === 'done').length;

  return (
    <div className="glass absolute inset-x-3 bottom-3 z-10 rounded-2xl px-3 pb-3 pt-2.5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="micro">Renders</span>
        <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
          <span className="text-stone-900 dark:text-white">{doneCount}</span> / {results.length} ready
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {results.map((r, i) => {
          const active = r.key === selectedKey;
          const thumb = r.status === 'done' && r.image ? r.image : r.originalUrl;

          return (
            <motion.button
              key={r.key}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
              onClick={() => onSelect(r.key)}
              title={r.stock ? `#${r.stock} · ${r.name}` : r.name}
              aria-pressed={active}
              aria-label={r.name}
              className={clsx(
                'group relative aspect-[3/2] w-[104px] shrink-0 overflow-hidden rounded-xl bg-stone-100 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-white/5',
                active
                  ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-white dark:ring-offset-ink-900'
                  : 'opacity-75 ring-1 ring-black/5 hover:opacity-100 dark:ring-white/10'
              )}
            >
              {thumb && (
                <img
                  src={thumb}
                  alt={r.name}
                  className={clsx(
                    'h-full w-full object-cover transition duration-300 group-hover:scale-105',
                    r.status === 'pending' && 'opacity-40 blur-[1px]'
                  )}
                />
              )}

              {/* Status marker — the dock has to be readable at a glance. */}
              <span className="absolute inset-0 grid place-items-center">
                {r.status === 'pending' && <Spinner size="sm" />}
                {r.status === 'error' && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/90">
                    <AlertTriangle className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </span>

              {r.status === 'done' && (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white/95 shadow">
                  <Check className="h-2.5 w-2.5 text-brand-700" strokeWidth={3.5} />
                </span>
              )}

              {r.status === 'done' && tagCounts[r.key] > 0 && (
                <span
                  className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur"
                  title={`${tagCounts[r.key]} tag${tagCounts[r.key] === 1 ? '' : 's'} on this photo`}
                >
                  <BadgeCheck className="h-2.5 w-2.5" />
                  {tagCounts[r.key]}
                </span>
              )}

              {r.stock && (
                <span className="absolute bottom-1 left-1 max-w-[70%] truncate rounded-full bg-white/90 px-1.5 py-0.5 font-mono text-[9px] font-medium text-stone-800">
                  {r.stock}
                </span>
              )}

              {r.hex && (
                <span
                  className="absolute left-1 top-1 h-3 w-3 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: r.hex }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
