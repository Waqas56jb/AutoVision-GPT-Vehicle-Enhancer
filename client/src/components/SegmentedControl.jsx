import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Choose one option from a small set — a grid of quiet tiles with a champagne
 * selection that glides between them.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {{value:string,label:string,hint?:string}[]} props.options
 * @param {string} props.value
 * @param {(value:string)=>void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function SegmentedControl({ label, options, value, onChange, disabled }) {
  return (
    <div>
      <label className="label mb-3 block">{label}</label>
      <div className={clsx('grid gap-2', options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={clsx(
                'relative isolate flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                active
                  ? 'border-brand-400 text-stone-900 dark:border-brand-400/70 dark:text-white'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-white/10 dark:text-stone-300 dark:hover:border-white/20 dark:hover:bg-white/[0.04]',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* The selected fill slides between options instead of blinking. */}
              {active && (
                <motion.span
                  layoutId={`segment-${label}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-brand-50 shadow-glow dark:bg-brand-400/10"
                />
              )}
              <span className="text-[13px] font-semibold">{opt.label}</span>
              {opt.hint && (
                <span className={clsx('mt-0.5 text-[10.5px] leading-snug', active ? 'text-brand-700 dark:text-brand-300' : 'text-stone-400')}>
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
