import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { PIPELINE_STEPS } from '../constants/index.js';

/**
 * Full-card overlay that walks through the pipeline steps while the request
 * is in-flight, so the (sometimes slow) generation feels transparent.
 */
export default function LoadingOverlay({ active, uploadPercent }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PIPELINE_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 text-brand-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-semibold">
              {uploadPercent > 0 && uploadPercent < 100
                ? `Uploading… ${uploadPercent}%`
                : 'Working on your image…'}
            </span>
          </div>

          <ul className="mt-6 w-full max-w-xs space-y-2.5">
            {PIPELINE_STEPS.map((step, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      'flex h-5 w-5 items-center justify-center rounded-full border ' +
                      (done
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : current
                          ? 'border-brand-400 text-brand-400'
                          : 'border-white/20 text-transparent')
                    }
                  >
                    {done ? <Check className="h-3 w-3" /> : current ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                  </span>
                  <span className={done || current ? 'text-slate-200' : 'text-slate-500'}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs text-slate-500">This can take 15–60 seconds.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
