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
      <label className="mb-2 block text-sm font-semibold text-slate-200">{label}</label>
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
                'flex flex-1 basis-[80px] flex-col items-center rounded-xl border px-2 py-2.5 text-center transition',
                active
                  ? 'border-brand-500 bg-brand-500/15 text-white shadow-glow'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <span className="text-sm font-semibold">{opt.label}</span>
              {opt.hint && <span className="mt-0.5 text-[11px] text-slate-400">{opt.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
