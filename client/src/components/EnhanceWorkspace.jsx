import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import ImageDropzone from './ImageDropzone.jsx';
import ResultPanel from './ResultPanel.jsx';
import LoadingOverlay from './LoadingOverlay.jsx';
import { useEnhance } from '../hooks/useEnhance.js';

/**
 * The two-column workspace: inputs (vehicle, background, notes) on the left,
 * the result / before-after comparison on the right.
 */
export default function EnhanceWorkspace() {
  const [vehicle, setVehicle] = useState(null);
  const [background, setBackground] = useState(null);
  const [notes, setNotes] = useState('');

  const { isLoading, uploadPercent, result, error, run, reset } = useEnhance();

  // Local preview URL of the original vehicle, for the before/after slider.
  const originalUrl = useMemo(
    () => (vehicle ? URL.createObjectURL(vehicle) : null),
    [vehicle]
  );

  const handleReset = () => {
    reset();
    setVehicle(null);
    setBackground(null);
    setNotes('');
  };

  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">1 · Your photos</h2>

          <div className="space-y-5">
            <ImageDropzone
              label="Vehicle photo"
              hint="Any location, any lighting — JPEG / PNG / WEBP, up to 25 MB"
              file={vehicle}
              onChange={setVehicle}
              required
              disabled={isLoading}
            />

            <ImageDropzone
              label="Background scene (optional)"
              hint="Leave empty for a clean studio backdrop"
              file={background}
              onChange={setBackground}
              disabled={isLoading}
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Extra instructions (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
                rows={3}
                placeholder="e.g. front 3/4 angle, remove the number plate, slightly warmer tone…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-brand-500"
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => run({ vehicle, background, notes })}
              disabled={isLoading || !vehicle}
            >
              <Wand2 className="h-5 w-5" />
              {isLoading ? 'Enhancing…' : 'Enhance image'}
            </button>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ── Result ─────────────────────────────────────────── */}
        <div className="card relative p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">2 · Result</h2>
          <LoadingOverlay active={isLoading} uploadPercent={uploadPercent} />
          <ResultPanel originalUrl={originalUrl} result={result} onReset={handleReset} />
        </div>
      </div>
    </section>
  );
}
