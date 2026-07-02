import { useState } from 'react';
import { Wand2, Download, RotateCcw, ImageOff } from 'lucide-react';
import MultiImageDropzone from './MultiImageDropzone.jsx';
import BackgroundPicker from './BackgroundPicker.jsx';
import SegmentedControl from './SegmentedControl.jsx';
import ResultCard from './ResultCard.jsx';
import { useEnhanceBatch } from '../hooks/useEnhanceBatch.js';
import { downloadDataUrl } from '../utils/download.js';
import {
  FRAMING_OPTIONS,
  DEFAULT_FRAMING,
  FORMAT_OPTIONS,
  DEFAULT_FORMAT,
} from '../constants/index.js';

/**
 * Background & Enhance mode — supports BATCH: upload one or many vehicle photos,
 * pick a saved/uploaded background, choose framing + format, and process them
 * all into dealership-ready images shown in a before/after gallery.
 */
export default function EnhanceWorkspace() {
  const [vehicles, setVehicles] = useState([]);
  const [bgFile, setBgFile] = useState(null);
  const [bgId, setBgId] = useState('');
  const [framing, setFraming] = useState(DEFAULT_FRAMING);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [notes, setNotes] = useState('');

  const { isRunning, results, run, reset } = useEnhanceBatch();

  const doneCount = results.filter((r) => r.status === 'done').length;

  const handleReset = () => {
    reset();
    setVehicles([]);
    setBgFile(null);
    setBgId('');
    setFraming(DEFAULT_FRAMING);
    setFormat(DEFAULT_FORMAT);
    setNotes('');
  };

  const downloadAll = () => {
    results
      .filter((r) => r.status === 'done' && r.image)
      .forEach((r, i) =>
        setTimeout(() => downloadDataUrl(r.image, `enhanced-${r.name.replace(/\.[^.]+$/, '')}.png`), i * 250)
      );
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl px-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">1 · Photos &amp; settings</h2>

          <div className="space-y-5">
            <MultiImageDropzone files={vehicles} onChange={setVehicles} disabled={isRunning} />

            <BackgroundPicker
              file={bgFile}
              onFileChange={setBgFile}
              selectedId={bgId}
              onSelectId={setBgId}
              disabled={isRunning}
            />

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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Extra instructions (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isRunning}
                rows={2}
                placeholder="e.g. remove the number plate, slightly warmer tone…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-brand-500"
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => run({ vehicles, background: bgFile, backgroundId: bgId, framing, format, notes })}
              disabled={isRunning || vehicles.length === 0}
            >
              <Wand2 className="h-5 w-5" />
              {isRunning
                ? 'Processing…'
                : `Enhance ${vehicles.length || ''} image${vehicles.length === 1 ? '' : 's'}`}
            </button>
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
              <p className="font-medium text-slate-400">Your enhanced images will appear here</p>
              <p className="mt-1 text-sm">Add photos, choose a background, then Enhance.</p>
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
