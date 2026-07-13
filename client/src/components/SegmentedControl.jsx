import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Compact segmented button group for choosing one option from a small set.
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
      <label className="label mb-2.5 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'relative flex flex-1 basis-[90px] flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition duration-200',
                active
                  ? 'border-brand-500 text-brand-800 shadow-glow'
                  : 'border-brand-100 bg-white/80 text-slate-600 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/60',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* The selected pill slides between options instead of blinking. */}
              {active && (
                <motion.span
                  layoutId={`segment-${label}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-2xl bg-brand-50"
                />
              )}
              <span className="text-sm font-semibold">{opt.label}</span>
              {opt.hint && (
                <span
                  className={clsx(
                    'mt-0.5 text-[11px]',
                    active ? 'text-brand-600' : 'text-slate-400'
                  )}
                >
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
