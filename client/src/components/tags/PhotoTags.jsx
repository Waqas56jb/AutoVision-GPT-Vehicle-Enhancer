import clsx from 'clsx';
import { BadgeCheck, Plus, RotateCcw, Pencil } from 'lucide-react';
import { APPLY_RULES, ruleApplies } from '../../tags/tagModel.js';

/**
 * Per-photo tag switches for the photo on the stage. Each tag starts from its
 * rule ("First photo", "Exterior shots"…); flipping a switch overrides the rule
 * for this photo only.
 */
export default function PhotoTags({ tags, selected, overrides, onToggle, onReset, onEdit, onCreate }) {
  const own = (selected && overrides[selected.key]) || {};
  const hasOverrides = Object.keys(own).some((id) => tags.some((t) => t.id === id));

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="label flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-brand-600" /> Tags on this photo
        </label>
        {hasOverrides && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-white/5"
            title="Go back to each tag's automatic rule for this photo"
          >
            <RotateCcw className="h-3 w-3" /> Auto
          </button>
        )}
      </div>

      {!tags.length ? (
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-200 px-3 py-3 text-xs font-semibold text-brand-600 transition hover:border-brand-400 hover:bg-brand-50 dark:border-white/15 dark:text-brand-300 dark:hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" /> Create your first tag
        </button>
      ) : !selected ? (
        <p className="text-[11px] text-slate-400">Pick a photo in the strip below.</p>
      ) : (
        <ul className="space-y-1.5">
          {tags.map((tag) => {
            const auto = ruleApplies(tag, selected);
            const isOverride = tag.id in own;
            const on = isOverride ? own[tag.id] : auto;
            const rule = APPLY_RULES.find((r) => r.value === tag.applyTo)?.label;
            return (
              <li
                key={tag.id}
                className={clsx(
                  'flex items-center gap-2 rounded-xl border px-2.5 py-2 transition',
                  on
                    ? 'border-brand-300 bg-brand-50/70 dark:border-brand-400/40 dark:bg-brand-600/15'
                    : 'border-brand-100 bg-white dark:border-white/10 dark:bg-ink-800'
                )}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${tag.name} on this photo`}
                  onClick={() => onToggle(tag.id, !on)}
                  className={clsx(
                    'relative h-5 w-9 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                    on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-white/20'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                      on ? 'left-[18px]' : 'left-0.5'
                    )}
                  />
                </button>
                <button type="button" onClick={() => onToggle(tag.id, !on)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-bold text-slate-700 dark:text-slate-100">{tag.name}</span>
                  <span className="block truncate text-[10.5px] text-slate-400">
                    {isOverride ? 'Set for this photo' : `Auto · ${rule}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(tag)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-brand-700 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Edit tag"
                  aria-label={`Edit ${tag.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
