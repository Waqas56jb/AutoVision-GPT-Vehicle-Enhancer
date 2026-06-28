import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { recolorImage } from '../api/recolor.api.js';
import { compressImage } from '../utils/compressImage.js';

/**
 * Drives the multi-colour recolour flow: compresses the template once, then
 * fires one request per selected colour with limited concurrency, updating
 * each result card independently as it completes.
 */
const CONCURRENCY = 2;

export function useRecolor() {
  const [isRunning, setIsRunning] = useState(false);
  // results: [{ key, name, hex, status: 'pending'|'done'|'error', image, meta, error }]
  const [results, setResults] = useState([]);

  const run = useCallback(async ({ template, colors, format, notes }) => {
    if (!template) {
      toast.error('Add the template car image first.');
      return;
    }
    if (!colors?.length) {
      toast.error('Select at least one colour.');
      return;
    }

    setIsRunning(true);
    setResults(colors.map((c) => ({ ...c, status: 'pending', image: null, meta: null, error: null })));

    const toastId = toast.loading(`Generating ${colors.length} colour variant(s)…`);

    let compressed;
    try {
      compressed = await compressImage(template);
    } catch {
      compressed = template;
    }

    const updateAt = (index, patch) =>
      setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    let cursor = 0;
    const worker = async () => {
      while (cursor < colors.length) {
        const index = cursor++;
        const c = colors[index];
        try {
          const data = await recolorImage({
            template: compressed,
            colorName: c.name,
            colorHex: c.hex,
            format,
            notes,
          });
          updateAt(index, { status: 'done', image: data.image, meta: data.meta });
        } catch (err) {
          const message =
            err?.response?.data?.error?.message || err?.message || 'Failed to recolour.';
          updateAt(index, { status: 'error', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, colors.length) }, worker));

    setIsRunning(false);
    toast.success('Colour variants ready!', { id: toastId });
  }, []);

  const reset = useCallback(() => setResults([]), []);

  return { isRunning, results, run, reset };
}

export default useRecolor;
