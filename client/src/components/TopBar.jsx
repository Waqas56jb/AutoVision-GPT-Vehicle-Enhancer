import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2, Moon, Sun, Wand2 } from 'lucide-react';
import { ProgressBar } from './Loader.jsx';

/**
 * The studio's top bar — brand, the four workflow steps, and the one primary
 * action. Replaces the old vertical tool rail: the workflow reads left-to-right
 * as numbered steps, which is how a photographer actually works through a car.
 */
export default function TopBar({
  sections,
  active,
  onSelect,
  isDark,
  onToggleTheme,
  onGenerate,
  canGenerate,
  isRunning,
  jobCount,
  progress,
  summary,
}) {
  return (
    <header className="relative z-20 shrink-0 px-3 pt-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3 pr-2">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink-gradient shadow-card ring-1 ring-black/5 dark:ring-white/10">
            <span className="font-display text-[19px] italic leading-none text-brand-300">Av</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-brand-400 dark:border-ink-950" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold tracking-tight text-stone-900 dark:text-white">
              AutoVision <span className="display text-[17px] font-normal text-brand-600 dark:text-brand-300">Studio</span>
            </p>
            <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">{summary}</p>
          </div>
        </div>

        {/* Right-side actions (first on mobile so Generate is always reachable) */}
        <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 lg:order-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="icon-btn"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="btn-accent h-10 px-4 sm:px-5"
            aria-label={isRunning ? 'Generating' : `Generate ${jobCount || ''}`.trim()}
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isRunning ? 'Generating…' : `Generate${jobCount ? ` ${jobCount}` : ''}`}
            </span>
          </button>
        </div>

        {/* Workflow steps */}
        <nav
          aria-label="Studio steps"
          className="order-3 -mx-1 flex w-full overflow-x-auto px-1 lg:order-2 lg:mx-auto lg:w-auto lg:overflow-visible"
        >
          <div className="glass flex items-center gap-1 rounded-full p-1">
            {sections.map(({ id, label, icon: Icon, badge }, i) => {
              const on = id === active;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-label={label}
                  aria-current={on ? 'step' : undefined}
                  className={clsx(
                    'relative flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
                    on ? 'text-stone-900 dark:text-white' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="step-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      className="absolute inset-0 rounded-full bg-white shadow-soft ring-1 ring-stone-200/80 dark:bg-white/10 dark:ring-white/10"
                    />
                  )}
                  <span
                    className={clsx(
                      'relative grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold',
                      on ? 'bg-ink-900 text-white dark:bg-brand-300 dark:text-ink-950' : 'bg-stone-200/70 text-stone-600 dark:bg-white/10 dark:text-stone-300'
                    )}
                  >
                    {i + 1}
                  </span>
                  <Icon className="relative h-4 w-4 opacity-80" />
                  <span className="relative whitespace-nowrap">{label}</span>
                  {badge > 0 && (
                    <span className="relative rounded-full bg-brand-100 px-1.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-400/20 dark:text-brand-200">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {isRunning && (
        <ProgressBar value={progress} className="mt-3 h-1" />
      )}
    </header>
  );
}
