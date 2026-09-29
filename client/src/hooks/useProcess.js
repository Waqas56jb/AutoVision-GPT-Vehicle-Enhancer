import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { enhanceImage } from '../api/enhance.api.js';
import { compressImage } from '../utils/compressImage.js';
import { backgroundToFile } from '../utils/backgroundStorage.js';
import { BATCH_CONCURRENCY, MAX_ATTEMPTS, fileKey } from '../constants/index.js';
import { saveResult, clearResults as clearStoredResults } from '../utils/workspaceStorage.js';

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

  const run = useCallback(async ({ vehicles, background, colors, framing, format, notes, stocks = {} }) => {
    if (!vehicles?.length) {
      toast.error('Add at least one vehicle photo.');
      return;
    }

    // background is either 'keep' | 'studio' | <presetId>
    const backgroundMode = background === 'keep' ? 'keep' : 'studio';
    let backgroundId;
    let backgroundFile;
    if (background !== 'keep' && background !== 'studio') {
      backgroundId = background;
      backgroundFile = await backgroundToFile(background);
    }

    // One entry per colour (or a single "no colour" pass).
    const colorPasses = colors && colors.length ? colors : [null];

    // Build the job list (vehicle × colour).
    const jobs = [];
    vehicles.forEach((file, vIdx) => {
      const stock = (stocks[fileKey(file)] || '').trim();
      colorPasses.forEach((c) => {
        jobs.push({
          // Keyed on the photo's identity (not its position), so removing or
          // re-ordering photos never attaches a render to the wrong car.
          key: `${fileKey(file)}::${c ? c.key : 'orig'}`,
          fileKey: fileKey(file),
          file,
          fileName: file.name,
          vIndex: vIdx,
          stock,
          color: c,
          label: c ? `${file.name} · ${c.name}` : file.name,
          // The download name: stock number when given (with the colour appended
          // for multi-colour runs), else the original file name.
          downloadName: stock
            ? c && colors.length > 1
              ? `${stock}-${c.name}`
              : stock
            : file.name.replace(/\.[^.]+$/, ''),
        });
      });
    });

    cooldownUntil.current = 0;
    setIsRunning(true);
    /* The new batch goes first; earlier renders of OTHER photos are kept — a
       paid render is never thrown away just because another batch ran. Only a
       re-render of the same photo + colour replaces its previous result. */
    const batchKeys = new Set(jobs.map((j) => j.key));
    setResults((prev) => {
      prev
        .filter((r) => batchKeys.has(r.key))
        .forEach((r) => r.originalUrl && URL.revokeObjectURL(r.originalUrl));
      return [
        ...jobs.map((j, i) => ({
          key: j.key,
          fileKey: j.fileKey,
          name: j.label,
          // Position of the source photo in the upload — tag rules like
          // "first photo" key off this.
          vIndex: j.vIndex,
          order: i,
          stock: j.stock,
          downloadName: j.downloadName,
          hex: j.color?.hex || null,
          originalUrl: URL.createObjectURL(j.file),
          status: 'pending',
          image: null,
          meta: null,
          error: null,
        })),
        ...prev.filter((r) => !batchKeys.has(r.key)),
      ];
    });

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

    const updateByKey = (key, patch) =>
      setResults((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

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
            background: backgroundFile,
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
          updateByKey(job.key, { status: 'done', image: data.image, meta: data.meta });
          // Persist straight away: a refresh mid-batch must not lose paid renders.
          saveResult({
            key: job.key,
            fileKey: job.fileKey,
            name: job.label,
            order: index,
            stock: job.stock,
            downloadName: job.downloadName,
            hex: job.color?.hex || null,
            status: 'done',
            image: data.image,
            meta: data.meta,
          }).catch(() =>
            toast.error('This browser could not save a render — download it before closing.', {
              id: 'result-storage',
            })
          );
        } catch (err) {
          const message =
            err?.response?.data?.error?.message || err?.message || 'Failed to process.';
          updateByKey(job.key, { status: 'error', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: lanes }, worker));

    setIsRunning(false);
    toast.success('All images processed!', { id: toastId });
  }, []);

  /** Explicit "clear results" — the only way renders are removed. */
  const reset = useCallback(() => {
    setResults((prev) => {
      prev.forEach((r) => r.originalUrl && URL.revokeObjectURL(r.originalUrl));
      return [];
    });
    clearStoredResults().catch(() => {});
  }, []);

  /** Bring back saved renders after a reload. `photoFor(fileKey)` → File|undefined. */
  const restore = useCallback((saved, photoFor) => {
    setResults(
      saved.map((r) => {
        const file = photoFor(r.fileKey);
        return { ...r, status: 'done', error: null, originalUrl: file ? URL.createObjectURL(file) : null };
      })
    );
  }, []);

  return { isRunning, results, run, reset, restore };
}

export default useProcess;
