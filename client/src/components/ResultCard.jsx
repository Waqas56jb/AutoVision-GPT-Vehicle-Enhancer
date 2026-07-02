import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { downloadDataUrl } from '../utils/download.js';

/**
 * One batch result: before/after compare slider when done, spinner while
 * pending, message on error. Includes a per-item download button.
 *
 * @param {object} props
 * @param {{name:string, originalUrl:string, status:string, image:string, meta:object, error:string}} props.item
 */
export default function ResultCard({ item }) {
  const { name, originalUrl, status, image, meta, error } = item;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[3/2] bg-slate-900/60">
        {status === 'done' && image ? (
          <ReactCompareSlider
            itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original" />}
            itemTwo={<ReactCompareSliderImage src={image} alt="Enhanced" />}
            className="h-full w-full"
          />
        ) : status === 'pending' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
            <span className="text-xs">Processing…</span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-red-300">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100" title={name}>
            {name}
          </p>
          {meta && <p className="text-[11px] text-slate-500">{meta.size}</p>}
          {status === 'done' && <p className="text-[10px] text-slate-600">drag to compare</p>}
        </div>
        {status === 'done' && image && (
          <button
            onClick={() => downloadDataUrl(image, `enhanced-${name.replace(/\.[^.]+$/, '')}.png`)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            <Download className="h-3.5 w-3.5" /> Save
          </button>
        )}
      </div>
    </div>
  );
}
