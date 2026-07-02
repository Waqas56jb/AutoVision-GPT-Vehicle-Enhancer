import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { enhanceImage } from '../api/enhance.api.js';
import { compressImage } from '../utils/compressImage.js';

/**
 * Batch enhance: processes many vehicle photos through the same settings
 * (background, framing, format) with limited concurrency, updating each
 * result card independently. Handles 1 → 100 vehicles.
 */
const CONCURRENCY = 2;

export function useEnhanceBatch() {
  const [isRunning, setIsRunning] = useState(false);
  // results: [{ key, name, originalUrl, status, image, meta, error }]
  const [results, setResults] = useState([]);

  const run = useCallback(async ({ vehicles, background, backgroundId, framing, format, notes }) => {
    if (!vehicles?.length) {
      toast.error('Add at least one vehicle photo.');
      return;
    }

    setIsRunning(true);
    setResults(
      vehicles.map((f, i) => ({
        key: `${f.name}-${i}`,
        name: f.name,
        originalUrl: URL.createObjectURL(f),
        status: 'pending',
        image: null,
        meta: null,
        error: null,
      }))
    );

    const toastId = toast.loading(`Enhancing ${vehicles.length} image(s)…`);

    // Compress the background once (if it's an uploaded file).
    let bg = background;
    if (background) {
      try {
        bg = await compressImage(background);
      } catch {
        bg = background;
      }
    }

    const updateAt = (index, patch) =>
      setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    let cursor = 0;
    const worker = async () => {
      while (cursor < vehicles.length) {
        const index = cursor++;
        try {
          const vehicleC = await compressImage(vehicles[index]);
          const data = await enhanceImage({
            vehicle: vehicleC,
            background: bg,
            backgroundId: bg ? undefined : backgroundId,
            framing,
            format,
            notes,
          });
          updateAt(index, { status: 'done', image: data.image, meta: data.meta });
        } catch (err) {
          const message =
            err?.response?.data?.error?.message || err?.message || 'Failed to enhance.';
          updateAt(index, { status: 'error', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, vehicles.length) }, worker));

    setIsRunning(false);
    toast.success('All images processed!', { id: toastId });
  }, []);

  const reset = useCallback(() => setResults([]), []);

  return { isRunning, results, run, reset };
}

export default useEnhanceBatch;
