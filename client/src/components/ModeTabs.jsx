import { Wand2, Palette } from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { key: 'enhance', label: 'Background & Enhance', icon: Wand2 },
  { key: 'recolor', label: 'Colour Change', icon: Palette },
];

/**
 * Top-level mode switcher between the two pipelines.
 * @param {{mode:string, onChange:(m:string)=>void}} props
 */
export default function ModeTabs({ mode, onChange }) {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
            mode === key
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-slate-300 hover:bg-white/5'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
