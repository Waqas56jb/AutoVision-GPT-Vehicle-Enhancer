import { useState } from 'react';
import { Wand2, Download, RotateCcw, ImageOff } from 'lucide-react';
import MultiImageDropzone from './MultiImageDropzone.jsx';
import BackgroundManager from './BackgroundManager.jsx';
import SegmentedControl from './SegmentedControl.jsx';
import ColorPicker from './ColorPicker.jsx';
import ResultCard from './ResultCard.jsx';
import { useProcess } from '../hooks/useProcess.js';
import { downloadDataUrl } from '../utils/download.js';
import {
  FRAMING_OPTIONS,
  DEFAULT_FRAMING,
  FORMAT_OPTIONS,
  DEFAULT_FORMAT,
} from '../constants/index.js';

/**
 * Single-page workspace: bulk vehicle upload + background library (upload /
 * save / delete / select) + framing + format + optional paint-colour change,
 * producing a before/after gallery. Everything on one page — no tab switching.
 */
export default function Workspace() {
  const [vehicles, setVehicles] = useState([]);
  const [background, setBackground] = useState('studio'); // 'keep' | 'studio' | presetId
  const [colors, setColors] = useState([]); // optional recolour targets
  const [framing, setFraming] = useState(DEFAULT_FRAMING);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [notes, setNotes] = useState('');

  const { isRunning, results, run, reset } = useProcess();
  const doneCount = results.filter((r) => r.status === 'done').length;

  const jobCount = vehicles.length * (colors.length || 1);

  const handleReset = () => {
    reset();
    setVehicles([]);
    setBackground('studio');
    setColors([]);
    setFraming(DEFAULT_FRAMING);
    setFormat(DEFAULT_FORMAT);
    setNotes('');
  };

  const downloadAll = () => {
    results
      .filter((r) => r.status === 'done' && r.image)
      .forEach((r, i) =>
        setTimeout(
          () => downloadDataUrl(r.image, `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`),
          i * 250
        )
      );
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl px-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">1 · Upload &amp; settings</h2>

          <div className="space-y-5">
            <MultiImageDropzone files={vehicles} onChange={setVehicles} disabled={isRunning} />

            <BackgroundManager value={background} onChange={setBackground} disabled={isRunning} />

            <ColorPicker value={colors} onChange={setColors} disabled={isRunning} />

            <div className="grid gap-5 sm:grid-cols-1">
              <SegmentedControl
                label="Vehicle size in frame"
                options={FRAMING_OPTIONS}
                value={framing}
                onChange={setFraming}
                disabled={isRunning}
              />
              <SegmentedControl
                label="Output format"
                options={FORMAT_OPTIONS}
                value={format}
                onChange={setFormat}
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Extra instructions (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isRunning}
                rows={2}
                placeholder="e.g. remove the number plate, keep the black roof, warmer tone…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-brand-500"
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => run({ vehicles, background, colors, framing, format, notes })}
              disabled={isRunning || vehicles.length === 0}
            >
              <Wand2 className="h-5 w-5" />
              {isRunning ? 'Processing…' : `Generate ${jobCount || ''} image${jobCount === 1 ? '' : 's'}`}
            </button>

            {colors.length > 0 && vehicles.length > 0 && (
              <p className="text-center text-xs text-slate-500">
                {vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'} × {colors.length} colour
                {colors.length === 1 ? '' : 's'} = {jobCount} images
              </p>
            )}
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">2 · Results</h2>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                {doneCount > 1 && (
                  <button onClick={downloadAll} className="btn-ghost px-3 py-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> All ({doneCount})
                  </button>
                )}
                <button onClick={handleReset} className="btn-ghost px-3 py-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <ImageOff className="mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium text-slate-400">Your finished images will appear here</p>
              <p className="mt-1 text-sm">Add photos, pick a background &amp; (optionally) colours, then Generate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((item) => (
                <ResultCard key={item.key} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
