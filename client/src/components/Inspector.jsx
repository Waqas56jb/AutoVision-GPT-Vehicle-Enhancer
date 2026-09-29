import { Download, Eraser } from 'lucide-react';
import SegmentedControl from './SegmentedControl.jsx';
import PhotoTags from './tags/PhotoTags.jsx';
import { FRAMING_OPTIONS, FORMAT_OPTIONS } from '../constants/index.js';

function Group({ children }) {
  return <div className="border-b border-stone-200/80 px-5 py-5 last:border-b-0 dark:border-white/[0.07]">{children}</div>;
}

/**
 * Right-hand inspector: the output settings that apply to the whole batch,
 * the tags on the photo that is on stage, and the batch actions.
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
  photoTags,
}) {
  return (
    <aside className="pane flex w-full shrink-0 flex-col overflow-hidden lg:h-full lg:w-[308px]">
      <div className="shrink-0 px-5 pb-4 pt-5">
        <p className="micro">Finish</p>
        <h2 className="display mt-1 text-[30px] leading-none text-stone-900 dark:text-white">Output</h2>
      </div>
      <div className="mx-5 h-px shrink-0 bg-stone-200/80 dark:bg-white/[0.07]" />

      <div className="flex-1 overflow-y-auto lg:min-h-0">
        {/* Tags are applied after rendering, so they only matter once there are results. */}
        {hasResults && photoTags && (
          <Group>
            <PhotoTags {...photoTags} />
          </Group>
        )}

        <Group>
          <SegmentedControl
            label="Vehicle size in frame"
            options={FRAMING_OPTIONS}
            value={framing}
            onChange={onFraming}
            disabled={disabled}
          />
        </Group>

        <Group>
          <SegmentedControl
            label="Output format"
            options={FORMAT_OPTIONS}
            value={format}
            onChange={onFormat}
            disabled={disabled}
          />
        </Group>

        <Group>
          <label className="label mb-2 block">
            Extra instructions <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="e.g. keep the black roof, warmer tone…"
            className="field resize-none"
          />
        </Group>
      </div>

      {hasResults && (
        <footer className="shrink-0 space-y-2 border-t border-stone-200/80 p-4 dark:border-white/[0.07]">
          <button type="button" onClick={onDownloadAll} disabled={doneCount === 0} className="btn-primary w-full">
            <Download className="h-4 w-4" />
            Download all ({doneCount})
          </button>
          <button type="button" onClick={onReset} disabled={disabled} className="btn-ghost w-full text-stone-500">
            <Eraser className="h-4 w-4" /> Clear renders
          </button>
        </footer>
      )}
    </aside>
  );
}
