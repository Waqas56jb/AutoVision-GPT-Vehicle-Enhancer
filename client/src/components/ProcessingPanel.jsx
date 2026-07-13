import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Car } from 'lucide-react';
import clsx from 'clsx';
import { ProgressRing, Spinner } from './Loader.jsx';
import { PIPELINE_STEPS } from '../constants/index.js';

/**
 * Shown on the stage while a batch runs and nothing has landed yet. It lives
 * in the stage rather than over the whole app so the rest of the workbench
 * stays readable — and it disappears the moment the first image arrives.
 *
 * gpt-image-1 takes ~1 minute per image and reports no per-stage progress, so
 * the ring tracks real batch completion while the stage list advances on a
 * timer purely to show the pipeline is moving.
 *
 * @param {object} props
 * @param {number} props.done   images finished (done + failed)
 * @param {number} props.total  images requested
 */
export default function ProcessingPanel({ done, total }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, PIPELINE_STEPS.length - 1)),
      7000
    );
    return () => clearInterval(id);
  }, []);

  const percent = total > 0 ? (done / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-white bg-white/85 p-8 shadow-lift backdrop-blur-xl"
    >
      <ProgressRing value={percent}>
        <Car className="mb-1 h-6 w-6 animate-float text-brand-600" />
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
          {Math.round(percent)}%
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {done} of {total}
        </span>
      </ProgressRing>

      <h3 className="mt-6 text-lg font-extrabold tracking-tight text-slate-900">
        Enhancing your vehicles
      </h3>
      <p className="mt-1 text-center text-sm text-slate-500">
        About a minute per image. Results appear below as they finish.
      </p>

      <ul className="mt-6 w-full space-y-0.5">
        {PIPELINE_STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'todo';
          return (
            <motion.li
              key={label}
              animate={{ opacity: state === 'todo' ? 0.4 : 1 }}
              transition={{ duration: 0.3 }}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                state === 'active' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-500'
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {state === 'done' ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="grid h-5 w-5 place-items-center rounded-full bg-brand-600"
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </motion.span>
                ) : state === 'active' ? (
                  <Spinner size="sm" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-200" />
                )}
              </span>
              {label}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
