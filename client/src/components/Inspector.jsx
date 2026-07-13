import { Download, RotateCcw, Sliders } from 'lucide-react';
import SegmentedControl from './SegmentedControl.jsx';
import { FRAMING_OPTIONS, FORMAT_OPTIONS } from '../constants/index.js';

/**
 * Right-hand inspector: the output settings that apply to the whole batch,
 * plus the batch-level actions. Deliberately separated from the drawer, which
 * holds the *inputs* (photos, background, colour).
 */
export default function Inspector({
  framing,
  onFraming,
  format,
  onFormat,
  notes,
  onNotes,
  disabled,
  doneCount,
  hasResults,
  onDownloadAll,
  onReset,
}) {
  return (
    <aside className="pane flex w-full shrink-0 flex-col border-t lg:h-full lg:w-[300px] lg:border-l lg:border-t-0">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-100 px-4">
        <Sliders className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Output</h2>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 lg:min-h-0">
        <SegmentedControl
          label="Vehicle size in frame"
          options={FRAMING_OPTIONS}
          value={framing}
          onChange={onFraming}
          disabled={disabled}
        />

        <SegmentedControl
          label="Output format"
          options={FORMAT_OPTIONS}
          value={format}
          onChange={onFormat}
          disabled={disabled}
        />

        <div>
          <label className="label mb-2 block">
            Extra instructions <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="e.g. remove the number plate, keep the black roof, warmer tone…"
            className="field resize-none"
          />
        </div>
      </div>

      {hasResults && (
        <footer className="shrink-0 space-y-2 border-t border-brand-100 bg-canvas p-4">
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={doneCount === 0}
            className="btn-primary w-full"
          >
            <Download className="h-4 w-4" />
            Download all ({doneCount})
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="btn-ghost w-full"
          >
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
        </footer>
      )}
    </aside>
  );
}
