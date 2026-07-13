import { motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from './Loader.jsx';

/**
 * Horizontal strip of every job in the batch. This is how you move between
 * results — clicking a frame promotes it to the stage.
 *
 * @param {object} props
 * @param {object[]} props.results
 * @param {string} props.selectedKey
 * @param {(key:string)=>void} props.onSelect
 */
export default function Filmstrip({ results, selectedKey, onSelect }) {
  if (!results.length) return null;

  const doneCount = results.filter((r) => r.status === 'done').length;

  return (
    <div className="shrink-0 border-t border-brand-100 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="micro">Batch</span>
        <span className="text-[11px] font-bold text-slate-500">
          <span className="text-brand-600">{doneCount}</span> / {results.length} ready
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {results.map((r, i) => {
          const active = r.key === selectedKey;
          const thumb = r.status === 'done' && r.image ? r.image : r.originalUrl;

          return (
            <motion.button
              key={r.key}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
              onClick={() => onSelect(r.key)}
              title={r.name}
              className={clsx(
                'group relative aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-xl border-2 transition duration-200',
                active
                  ? 'border-brand-500 shadow-glow'
                  : 'border-transparent opacity-70 hover:-translate-y-0.5 hover:opacity-100 hover:shadow-soft'
              )}
            >
              <img
                src={thumb}
                alt={r.name}
                className={clsx(
                  'h-full w-full object-cover transition',
                  r.status === 'pending' && 'opacity-40 blur-[1px]'
                )}
              />

              {/* Status marker — the strip has to be readable at a glance. */}
              <span className="absolute inset-0 grid place-items-center">
                {r.status === 'pending' && <Spinner size="sm" />}
                {r.status === 'error' && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/90">
                    <AlertTriangle className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </span>

              {r.status === 'done' && (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-600 shadow">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                </span>
              )}

              {r.hex && (
                <span
                  className="absolute bottom-1 left-1 h-3 w-3 rounded-full ring-2 ring-white"
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
