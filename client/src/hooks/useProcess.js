import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { enhanceImage } from '../api/enhance.api.js';
import { compressImage } from '../utils/compressImage.js';

/**
 * Unified processing hook (single page). Builds one job per
 * (vehicle × colour) combination — colours optional — and runs them through
 * the enhance pipeline with limited concurrency.
 */
const CONCURRENCY = 2;

export function useProcess() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);

  const run = useCallback(async ({ vehicles, background, colors, framing, format, notes }) => {
    if (!vehicles?.length) {
      toast.error('Add at least one vehicle photo.');
      return;
    }

    // background is either 'keep' | 'studio' | <presetId>
    const backgroundId = background !== 'keep' && background !== 'studio' ? background : undefined;
    const backgroundMode = background === 'keep' ? 'keep' : 'studio';

    // One entry per colour (or a single "no colour" pass).
    const colorPasses = colors && colors.length ? colors : [null];

    // Build the job list (vehicle × colour).
    const jobs = [];
    vehicles.forEach((file, vIdx) => {
      colorPasses.forEach((c) => {
        jobs.push({
          key: `${file.name}-${vIdx}-${c ? c.key : 'orig'}`,
          file,
          fileName: file.name,
          color: c,
          label: c ? `${file.name} · ${c.name}` : file.name,
        });
      });
    });

    setIsRunning(true);
    setResults(
      jobs.map((j) => ({
        key: j.key,
        name: j.label,
        hex: j.color?.hex || null,
        originalUrl: URL.createObjectURL(j.file),
        status: 'pending',
        image: null,
        meta: null,
        error: null,
      }))
    );

    const toastId = toast.loading(`Processing ${jobs.length} image(s)…`);

    // Compress each unique vehicle once (cache by index).
    const compressedCache = new Map();
    const getCompressed = async (file, name) => {
      if (compressedCache.has(name)) return compressedCache.get(name);
      let c;
      try {
        c = await compressImage(file);
      } catch {
        c = file;
      }
      compressedCache.set(name, c);
      return c;
    };

    const updateAt = (index, patch) =>
      setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const index = cursor++;
        const job = jobs[index];
        try {
          const vehicle = await getCompressed(job.file, job.fileName);
          const data = await enhanceImage({
            vehicle,
            backgroundId,
            backgroundMode,
            colorName: job.color?.name,
            colorHex: job.color?.hex,
            framing,
            format,
            notes,
          });
          updateAt(index, { status: 'done', image: data.image, meta: data.meta });
        } catch (err) {
          const message =
            err?.response?.data?.error?.message || err?.message || 'Failed to process.';
          updateAt(index, { status: 'error', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

    setIsRunning(false);
    toast.success('All images processed!', { id: toastId });
  }, []);

  const reset = useCallback(() => setResults([]), []);

  return { isRunning, results, run, reset };
}

export default useProcess;
