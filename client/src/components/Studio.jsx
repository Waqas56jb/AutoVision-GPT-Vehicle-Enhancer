import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Images, Mountain, Palette, Wand2, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import StudioRail from './StudioRail.jsx';
import MultiImageDropzone from './MultiImageDropzone.jsx';
import BackgroundManager from './BackgroundManager.jsx';
import ColorPicker from './ColorPicker.jsx';
import CanvasStage from './CanvasStage.jsx';
import Filmstrip from './Filmstrip.jsx';
import Inspector from './Inspector.jsx';
import { ProgressBar } from './Loader.jsx';
import { useProcess } from '../hooks/useProcess.js';
import { downloadDataUrl } from '../utils/download.js';
import { APP_NAME, DEFAULT_FRAMING, DEFAULT_FORMAT } from '../constants/index.js';

/**
 * The workbench. Four panes: a navy tool rail, an inputs drawer, the stage
 * (one big preview + a filmstrip of the batch), and an output inspector.
 * The rail switches which input section the drawer shows.
 */
export default function Studio() {
  const [section, setSection] = useState('photos');

  const [vehicles, setVehicles] = useState([]);
  const [background, setBackground] = useState('studio'); // 'keep' | 'studio' | presetId
  const [colors, setColors] = useState([]); // optional recolour targets
  const [framing, setFraming] = useState(DEFAULT_FRAMING);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [notes, setNotes] = useState('');

  const [pickedKey, setPickedKey] = useState(null);

  const { isRunning, results, run, reset } = useProcess();

  const doneCount = results.filter((r) => r.status === 'done').length;
  const settledCount = results.filter((r) => r.status !== 'pending').length;
  const jobCount = vehicles.length * (colors.length || 1);

  /* Whatever the user clicked, else the first finished image, else the first
     job — so the stage fills itself as results stream in, with no effect. */
  const selected = useMemo(
    () =>
      results.find((r) => r.key === pickedKey) ??
      results.find((r) => r.status === 'done') ??
      results[0] ??
      null,
    [results, pickedKey]
  );

  const SECTIONS = [
    { id: 'photos', label: 'Vehicle photos', icon: Images, badge: vehicles.length },
    { id: 'background', label: 'Background', icon: Mountain },
    { id: 'colour', label: 'Paint colour', icon: Palette, badge: colors.length },
  ];
  const activeSection = SECTIONS.find((s) => s.id === section);

  const handleReset = () => {
    reset();
    setVehicles([]);
    setBackground('studio');
    setColors([]);
    setFraming(DEFAULT_FRAMING);
    setFormat(DEFAULT_FORMAT);
    setNotes('');
    setPickedKey(null);
    setSection('photos');
  };

  const handleGenerate = () => {
    setPickedKey(null);
    run({ vehicles, background, colors, framing, format, notes });
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
    <div className="flex min-h-full flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      <StudioRail sections={SECTIONS} active={section} onSelect={setSection} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top bar ─────────────────────────────────────── */}
        <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 border-b border-brand-100 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900">
              {APP_NAME}
              <span className="ml-2 hidden rounded-md bg-brand-50 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand-700 sm:inline">
                Studio
              </span>
            </h1>
            <p className="micro mt-0.5 truncate">
              {vehicles.length
                ? `${vehicles.length} photo${vehicles.length === 1 ? '' : 's'}${
                    colors.length ? ` · ${colors.length} colour${colors.length === 1 ? '' : 's'}` : ''
                  } · ${jobCount} image${jobCount === 1 ? '' : 's'} to render`
                : 'No vehicles loaded'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isRunning || vehicles.length === 0}
            className="btn-primary shrink-0 px-5"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isRunning ? 'Generating…' : `Generate${jobCount ? ` ${jobCount}` : ''}`}
            </span>
          </button>

          {/* Batch progress rides the bottom edge of the bar. */}
          {isRunning && (
            <ProgressBar
              value={results.length ? (settledCount / results.length) * 100 : 0}
              className="absolute inset-x-0 bottom-0 h-1 rounded-none"
            />
          )}
        </header>

        {/* ── Panes ───────────────────────────────────────── */}
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          {/* Inputs drawer — the rail decides which section shows. */}
          <aside className="pane flex w-full shrink-0 flex-col border-b lg:h-full lg:w-[340px] lg:border-b-0 lg:border-r">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-100 px-4">
              {activeSection && <activeSection.icon className="h-4 w-4 text-brand-600" />}
              <AnimatePresence mode="wait">
                <motion.h2
                  key={section}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-extrabold tracking-tight text-slate-900"
                >
                  {activeSection?.label}
                </motion.h2>
              </AnimatePresence>
            </header>

            {/* All three stay mounted — switching sections must not refetch the
                background library or drop the upload previews. */}
            <div className="flex-1 overflow-y-auto p-4 lg:min-h-0">
              <div className={clsx(section !== 'photos' && 'hidden')}>
                <MultiImageDropzone files={vehicles} onChange={setVehicles} disabled={isRunning} />
              </div>
              <div className={clsx(section !== 'background' && 'hidden')}>
                <BackgroundManager value={background} onChange={setBackground} disabled={isRunning} />
              </div>
              <div className={clsx(section !== 'colour' && 'hidden')}>
                <ColorPicker value={colors} onChange={setColors} disabled={isRunning} />
              </div>
            </div>
          </aside>

          {/* Stage + filmstrip */}
          <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
            <CanvasStage
              selected={selected}
              isRunning={isRunning}
              settled={settledCount}
              total={results.length}
              onAddPhotos={() => setSection('photos')}
            />
            <Filmstrip
              results={results}
              selectedKey={selected?.key}
              onSelect={setPickedKey}
            />
          </main>

          <Inspector
            framing={framing}
            onFraming={setFraming}
            format={format}
            onFormat={setFormat}
            notes={notes}
            onNotes={setNotes}
            disabled={isRunning}
            doneCount={doneCount}
            hasResults={results.length > 0}
            onDownloadAll={downloadAll}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
