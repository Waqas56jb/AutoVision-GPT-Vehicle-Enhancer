import { useState } from 'react';
import { Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
          'group flex items-center gap-2 rounded-xl border px-3 py-2 transition',
          selected
            ? 'border-brand-500 bg-brand-500/15 text-white'
            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          className="relative h-6 w-6 shrink-0 rounded-full border border-white/30 shadow-inner"
          style={{ backgroundColor: color.hex }}
        >
          {selected && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-white drop-shadow" />
            </span>
          )}
        </span>
        <span className="text-sm font-medium">{color.name}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          Target colours <span className="text-brand-400">*</span>
        </label>
        <span className="text-xs text-slate-500">{value.length} selected</span>
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
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-400 transition hover:text-brand-500"
      >
        {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        More colours
      </button>

      {showMore && (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap gap-2">
            {MORE_COLORS.map((c) => (
              <Swatch key={c.key} color={c} />
            ))}
          </div>

          {/* Custom colour */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="color"
              value={customHex}
              disabled={disabled}
              onChange={(e) => setCustomHex(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-white/15 bg-transparent"
              title="Pick a custom colour"
            />
            <input
              type="text"
              value={customName}
              disabled={disabled}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Custom colour name (e.g. Midnight Purple)"
              className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand-500"
            />
            <button type="button" onClick={addCustom} disabled={disabled} className="btn-ghost">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Selected chips (so custom + hidden presets stay visible) */}
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((v) => v.key !== c.key))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              title="Remove"
            >
              <span
                className="h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: c.hex }}
              />
              {c.name} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
