import { motion } from 'framer-motion';
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider';
import { Download, RotateCcw, ImageOff } from 'lucide-react';
import { downloadDataUrl } from '../utils/download.js';

/**
 * Shows the before/after comparison (original vehicle vs enhanced result),
 * with a draggable slider, plus download / reset actions and meta info.
 */
export default function ResultPanel({ originalUrl, result, onReset }) {
  if (!result) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
        <ImageOff className="mb-3 h-10 w-10 opacity-40" />
        <p className="font-medium text-slate-400">Your enhanced image will appear here</p>
        <p className="mt-1 text-sm">Add a vehicle photo and click “Enhance image”.</p>
      </div>
    );
  }

  const { image, meta } = result;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col"
    >
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {originalUrl ? (
          <ReactCompareSlider
            itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original" />}
            itemTwo={<ReactCompareSliderImage src={image} alt="Enhanced" />}
            className="max-h-[60vh]"
          />
        ) : (
          <img src={image} alt="Enhanced" className="w-full" />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Drag the slider to compare before / after</span>
        {meta && (
          <span>
            {meta.model} · {meta.size} · {meta.quality} · {(meta.elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          onClick={() => downloadDataUrl(image, `autovision-${Date.now()}.png`)}
        >
          <Download className="h-4 w-4" /> Download result
        </button>
        <button className="btn-ghost" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> New image
        </button>
      </div>
    </motion.div>
  );
}
