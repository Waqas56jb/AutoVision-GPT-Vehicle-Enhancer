import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import { PRIMARY_COLORS, MORE_COLORS } from '../constants/index.js';

/**
 * Multi-select colour picker.
 *  - Always shows the 5 primary client colours.
 *  - "More colours" reveals extra presets.
 *  - "Custom" lets the dealer add any colour (name + hex).
 *
 * @param {object} props
 * @param {{key:string,name:string,hex:string}[]} props.value  selected colours
 * @param {(next:any[])=>void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function ColorPicker({ value, onChange, disabled }) {
  const [showMore, setShowMore] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#1763C8');

  const isSelected = (key) => value.some((v) => v.key === key);

  const toggle = (color) => {
    if (disabled) return;
    if (isSelected(color.key)) onChange(value.filter((v) => v.key !== color.key));
    else onChange([...value, color]);
  };

  const addCustom = () => {
    const name = customName.trim() || `Custom ${customHex}`;
    const key = `custom-${customHex.toLowerCase()}`;
    if (isSelected(key)) return;
    onChange([...value, { key, name, hex: customHex }]);
    setCustomName('');
  };

  const Swatch = ({ color }) => {
    const selected = isSelected(color.key);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggle(color)}
        title={color.name}
        className={clsx(
          'tile flex items-center gap-2.5 px-3 py-2',
          selected ? 'tile-active' : 'tile-idle',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full shadow-inner ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: color.hex }}
        >
          {selected && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check
                className={clsx(
                  'h-3.5 w-3.5 drop-shadow',
                  /* Tick has to survive on a white swatch as well as a black one. */
                  isLight(color.hex) ? 'text-slate-900' : 'text-white'
                )}
                strokeWidth={3}
              />
            </motion.span>
          )}
        </span>
        <span className="text-sm font-medium">{color.name}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="label">
          Change paint colour <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-medium transition',
            value.length ? 'bg-brand-50 text-brand-700' : 'text-slate-400'
          )}
        >
          {value.length ? `${value.length} selected` : 'keep original colour'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRIMARY_COLORS.map((c) => (
          <Swatch key={c.key} color={c} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        disabled={disabled}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-800"
      >
        <ChevronDown
          className={clsx('h-4 w-4 transition-transform duration-300', showMore && 'rotate-180')}
        />
        More colours
      </button>

      <AnimatePresence initial={false}>
        {showMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="panel mt-3 space-y-3 p-3.5">
              <div className="flex flex-wrap gap-2">
                {MORE_COLORS.map((c) => (
                  <Swatch key={c.key} color={c} />
                ))}
              </div>

              {/* Custom colour */}
              <div className="flex flex-wrap items-center gap-2 border-t border-brand-100 pt-3">
                <input
                  type="color"
                  value={customHex}
                  disabled={disabled}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-brand-100 bg-white p-1 shadow-soft"
                  title="Pick a custom colour"
                />
                <input
                  type="text"
                  value={customName}
                  disabled={disabled}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="Custom colour name (e.g. Midnight Purple)"
                  className="field min-w-[180px] flex-1 py-2.5"
                />
                <button type="button" onClick={addCustom} disabled={disabled} className="btn-ghost">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected chips (so custom + hidden presets stay visible) */}
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {value.map((c) => (
              <motion.button
                key={c.key}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((v) => v.key !== c.key))}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Remove"
              >
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                <X className="h-3 w-3" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Relative luminance test, so the tick stays legible on pale swatches. */
function isLight(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
