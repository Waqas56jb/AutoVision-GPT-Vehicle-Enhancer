import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Car } from 'lucide-react';

/**
 * The tool rail — the app's only dark surface, and its primary navigation.
 * Each icon swaps what the settings drawer shows.
 *
 * @param {object} props
 * @param {{id:string,label:string,icon:Function,badge?:number}[]} props.sections
 * @param {string} props.active
 * @param {(id:string)=>void} props.onSelect
 */
export default function StudioRail({ sections, active, onSelect }) {
  return (
    <nav className="rail flex shrink-0 flex-row items-center gap-2 px-3 py-2.5 lg:h-full lg:w-[72px] lg:flex-col lg:px-0 lg:py-4">
      {/* Brand mark doubles as the rail's anchor. */}
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
        <Car className="h-5 w-5 text-white" />
      </div>

      <span className="mx-1 h-8 w-px bg-white/10 lg:mx-0 lg:my-3 lg:h-px lg:w-8" />

      <div className="flex flex-1 flex-row items-center gap-2 lg:flex-col">
        {sections.map(({ id, label, icon: Icon, badge }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              title={label}
              aria-label={label}
              aria-current={isActive}
              className={clsx('rail-btn group', isActive && 'rail-btn-active')}
            >
              {/* Sliding indicator instead of a hard on/off state. */}
              {isActive && (
                <motion.span
                  layoutId="rail-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute -left-0.5 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-full bg-white lg:block"
                />
              )}

              <Icon className="h-[18px] w-[18px]" />

              {badge > 0 && (
                <span
                  className={clsx(
                    'absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ring-2',
                    isActive
                      ? 'bg-brand-600 text-white ring-white'
                      : 'bg-white text-brand-800 ring-ink-900'
                  )}
                >
                  {badge}
                </span>
              )}

              {/* Tooltip — the rail is icon-only, so labels have to live somewhere. */}
              <span className="pointer-events-none absolute left-full z-30 ml-3 hidden whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lift transition group-hover:opacity-100 lg:block">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
