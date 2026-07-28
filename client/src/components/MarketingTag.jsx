import { AnimatePresence, motion } from 'framer-motion';
import { Ban, BadgeCheck, PanelTop, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

/**
 * Chooses the marketing warranty tag applied to each finished image.
 *
 * Three options, matching the two dealer styles the client sent plus "off":
 *   none   — no tag.
 *   corner — a compact logo card in a top corner (auto-placed clear of the car).
 *   banner — a header band + footer band across the top and bottom.
 *
 * The manufacturer is detected automatically from the car; if its badge is not
 * clearly visible the tag is skipped rather than guessed. The text fields let
 * the operator override the auto-generated warranty copy per batch.
 */
const OPTIONS = [
  { value: 'none', label: 'No tag', icon: Ban, hint: 'Clean image, no overlay' },
  { value: 'corner', label: 'Corner logo', icon: BadgeCheck, hint: 'Compact badge in a top corner' },
  { value: 'banner', label: 'Header & footer', icon: PanelTop, hint: 'Bands top and bottom' },
];

export default function MarketingTag({ value, onChange, disabled }) {
  const [showText, setShowText] = useState(false);
  const tag = value || { style: 'none' };
  const set = (patch) => onChange({ ...tag, ...patch });
  const active = tag.style && tag.style !== 'none';

  return (
    <div>
      <div className="grid grid-cols-1 gap-2">
        {OPTIONS.map(({ value: v, label, icon: Icon, hint }) => {
          const on = (tag.style || 'none') === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => set({ style: v })}
              className={clsx(
                'tile flex items-center gap-3 px-3 py-2.5 text-left',
                on ? 'tile-active' : 'tile-idle',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[11px] text-slate-400">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-[11px] leading-relaxed text-slate-600">
              The manufacturer is detected from each car automatically. If a car's badge
              isn't clearly visible, its tag is skipped — never guessed.
            </p>

            <button
              type="button"
              onClick={() => setShowText((s) => !s)}
              disabled={disabled}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-800"
            >
              <ChevronDown
                className={clsx('h-4 w-4 transition-transform duration-300', showText && 'rotate-180')}
              />
              Customise warranty text
            </button>

            <AnimatePresence initial={false}>
              {showText && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2.5">
                    <input
                      type="text"
                      value={tag.title || ''}
                      disabled={disabled}
                      onChange={(e) => set({ title: e.target.value })}
                      placeholder="Title — e.g. Balance of Honda Warranty"
                      maxLength={60}
                      className="field py-2.5"
                    />
                    <input
                      type="text"
                      value={tag.subtitle || ''}
                      disabled={disabled}
                      onChange={(e) => set({ subtitle: e.target.value })}
                      placeholder="Subtitle — e.g. Unlimited KM warranty & roadside assist"
                      maxLength={90}
                      className="field py-2.5"
                    />
                    <input
                      type="text"
                      value={tag.footer || ''}
                      disabled={disabled}
                      onChange={(e) => set({ footer: e.target.value })}
                      placeholder="Footer — e.g. Dealer backed & verified"
                      maxLength={60}
                      className="field py-2.5"
                    />
                    <p className="text-[11px] text-slate-400">
                      Leave blank to use each brand's default wording.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
