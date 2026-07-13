import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { enhanceImage } from '../api/enhance.api.js';
import { compressImage } from '../utils/compressImage.js';
import { BATCH_CONCURRENCY, MAX_ATTEMPTS } from '../constants/index.js';

/**
 * Unified processing hook (single page). Builds one job per
 * (vehicle × colour) combination — colours optional — and runs them through
 * the enhance pipeline.
 *
 * Every job is an independent HTTP call, so N of them genuinely run in
 * parallel: a batch takes about `ceil(jobs / BATCH_CONCURRENCY) × 60s`, not
 * `jobs × 60s`. The limit on BATCH_CONCURRENCY is your OpenAI account's
 * images-per-minute quota, not this code — push past it and OpenAI answers 429.
 * When that happens we back the whole batch off rather than failing the image,
 * so the run self-tunes to whatever the account actually allows.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True for the errors that are worth waiting on: rate limits and upstream blips. */
const isRetryable = (err) => {
  const status = err?.response?.status;
  return status === 429 || status === 503 || status === 502 || status === 504;
};

export function useProcess() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);

  /* When any worker is rate-limited, every worker waits until this timestamp.
     Without a shared gate, the other workers keep hammering the API and each
     collects its own 429 — the batch degrades instead of throttling. */
  const cooldownUntil = useRef(0);

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

    cooldownUntil.current = 0;
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

    const lanes = Math.min(BATCH_CONCURRENCY, jobs.length);
    const toastId = toast.loading(
      `Rendering ${jobs.length} image${jobs.length === 1 ? '' : 's'} · ${lanes} at a time…`
    );

    // Compress each unique vehicle once, even if it is rendered in five colours.
    const compressedCache = new Map();
    const getCompressed = async (file, name) => {
      if (!compressedCache.has(name)) {
        compressedCache.set(
          name,
          compressImage(file).catch(() => file)
        );
      }
      return compressedCache.get(name);
    };

    const updateAt = (index, patch) =>
      setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    /** One image, with backoff on rate limits. */
    const renderJob = async (job) => {
      const vehicle = await getCompressed(job.file, job.fileName);

      for (let attempt = 1; ; attempt++) {
        // Respect a cooldown another worker may have triggered.
        const wait = cooldownUntil.current - Date.now();
        if (wait > 0) await sleep(wait);

        try {
          return await enhanceImage({
            vehicle,
            backgroundId,
            backgroundMode,
            colorName: job.color?.name,
            colorHex: job.color?.hex,
            framing,
            format,
            notes,
          });
        } catch (err) {
          if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) throw err;

          /* Exponential backoff, and hold the whole batch back — the server may
             also tell us exactly how long to wait via Retry-After. */
          const retryAfter = Number(err?.response?.headers?.['retry-after']);
          const backoff = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 2000 * 2 ** (attempt - 1);
          cooldownUntil.current = Math.max(cooldownUntil.current, Date.now() + backoff);
        }
      }
    };

    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const index = cursor++;
        const job = jobs[index];
        try {
          const data = await renderJob(job);
          updateAt(index, { status: 'done', image: data.image, meta: data.meta });
        } catch (err) {
          const message =
            err?.response?.data?.error?.message || err?.message || 'Failed to process.';
          updateAt(index, { status: 'error', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: lanes }, worker));

    setIsRunning(false);
    toast.success('All images processed!', { id: toastId });
  }, []);

  const reset = useCallback(() => setResults([]), []);

  return { isRunning, results, run, reset };
}

export default useProcess;
