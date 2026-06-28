import { useState } from 'react';
import { Palette, Download, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import ImageDropzone from './ImageDropzone.jsx';
import SegmentedControl from './SegmentedControl.jsx';
import ColorPicker from './ColorPicker.jsx';
import { useRecolor } from '../hooks/useRecolor.js';
import { downloadDataUrl } from '../utils/download.js';
import { FORMAT_OPTIONS, DEFAULT_FORMAT, PRIMARY_COLORS } from '../constants/index.js';

/** A single colour-variant result card. */
function VariantCard({ variant }) {
  const { name, hex, status, image, meta, error } = variant;
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[3/2] bg-slate-900/60">
        {status === 'done' && image && (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        )}
        {status === 'pending' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
            <span className="text-xs">Generating…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-red-300">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-white/30"
            style={{ backgroundColor: hex }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{name}</p>
            {meta && <p className="text-[11px] text-slate-500">{meta.size}</p>}
          </div>
        </div>
        {status === 'done' && image && (
          <button
            onClick={() => downloadDataUrl(image, `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            <Download className="h-3.5 w-3.5" /> Save
          </button>
        )}
      </div>
    </div>
  );
}

export default function RecolorWorkspace() {
  const [template, setTemplate] = useState(null);
  const [colors, setColors] = useState([PRIMARY_COLORS[1]]); // default: Gloss Black
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [notes, setNotes] = useState('');

  const { isRunning, results, run, reset } = useRecolor();

  const doneCount = results.filter((r) => r.status === 'done').length;

  const handleReset = () => {
    reset();
    setTemplate(null);
    setColors([PRIMARY_COLORS[1]]);
    setFormat(DEFAULT_FORMAT);
    setNotes('');
  };

  const downloadAll = () => {
    results
      .filter((r) => r.status === 'done' && r.image)
      .forEach((r, i) =>
        setTimeout(() => downloadDataUrl(r.image, `${r.name.replace(/\s+/g, '-').toLowerCase()}.png`), i * 250)
      );
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl px-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">1 · Template &amp; colours</h2>

          <div className="space-y-5">
            <ImageDropzone
              label="Template car image"
              hint="A finished advert (e.g. white MG4 1280×853). We keep its background, pose & framing."
              file={template}
              onChange={setTemplate}
              required
              disabled={isRunning}
            />

            <ColorPicker value={colors} onChange={setColors} disabled={isRunning} />

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
                placeholder="e.g. keep the black roof, matte finish…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-brand-500"
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => run({ template, colors, format, notes })}
              disabled={isRunning || !template || colors.length === 0}
            >
              <Palette className="h-5 w-5" />
              {isRunning ? 'Generating variants…' : `Generate ${colors.length || ''} colour variant${colors.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">2 · Colour variants</h2>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                {doneCount > 1 && (
                  <button onClick={downloadAll} className="btn-ghost px-3 py-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> All
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
              <Palette className="mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium text-slate-400">Your colour variants will appear here</p>
              <p className="mt-1 text-sm">Upload a template, pick colours, then generate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((v) => (
                <VariantCard key={v.key} variant={v} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
