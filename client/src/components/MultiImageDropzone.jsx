import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpFromLine, X, Plus, HardDrive } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_MB, fileKey } from '../constants/index.js';

/**
 * Batch vehicle-photo picker (1–100 images).
 *
 * Each photo can carry a STOCK NUMBER — the finished file is named after it. The
 * input is keyed by the file's stable identity (not its index), so removing a
 * photo never shuffles stock numbers onto the wrong car. Photos are persisted by
 * the Studio; removing one is immediate with an Undo, clearing all is confirmed.
 *
 * @param {object} props
 * @param {File[]} props.files
 * @param {(files:File[])=>void} props.onAdd
 * @param {(file:File)=>void} props.onRemove
 * @param {()=>void} props.onClearAll
 * @param {Record<string,string>} [props.stocks]        stock number by fileKey
 * @param {(key:string, value:string)=>void} [props.onStockChange]
 * @param {boolean} [props.disabled]
 */
export default function MultiImageDropzone({ files, onAdd, onRemove, onClearAll, stocks = {}, onStockChange, disabled }) {
  /* Object URLs are created once per file and revoked when it goes away —
     building them inline during render leaks a blob on every keystroke. */
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    const map = Object.fromEntries(files.map((f) => [fileKey(f), URL.createObjectURL(f)]));
    setPreviews(map);
    return () => Object.values(map).forEach(URL.revokeObjectURL);
  }, [files]);

  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        toast.error(`Some files were skipped (max ${MAX_FILE_MB} MB, images only).`);
      }
      if (accepted?.length) onAdd(accepted);
    },
    [onAdd]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    multiple: true,
    disabled,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-5 text-center transition duration-300',
          files.length ? 'min-h-[112px] py-5' : 'min-h-[220px] py-8',
          isDragActive
            ? 'border-brand-400 bg-brand-50/80 dark:bg-brand-400/10'
            : 'border-stone-300 bg-stone-50/70 hover:border-stone-400 hover:bg-stone-50 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-white/25 dark:hover:bg-white/[0.04]',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <motion.span
          animate={isDragActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-white text-stone-700 shadow-soft ring-1 ring-stone-200 dark:bg-white/10 dark:text-stone-100 dark:ring-white/10"
        >
          <ArrowUpFromLine className="h-[18px] w-[18px]" />
        </motion.span>
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
          {isDragActive ? 'Release to add the photos' : (
            <>
              Drop photos here, or <span className="text-brand-700 underline decoration-brand-300 underline-offset-4 dark:text-brand-300">browse</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          JPEG, PNG or WEBP · up to {MAX_FILE_MB} MB each · any number
        </p>
      </div>

      {files.length > 0 && (
        <>
          <div className="mb-2.5 mt-5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <HardDrive className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
              {files.length} saved on this device
            </p>
            <button
              type="button"
              onClick={onClearAll}
              disabled={disabled}
              className="rounded-full px-2 py-1 text-xs font-medium text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              Remove all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {files.map((f, i) => {
                const key = fileKey(f);
                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.2 }}
                    className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-white/5">
                      {previews[key] && (
                        <img
                          src={previews[key]}
                          alt={f.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-stone-700 shadow-sm backdrop-blur dark:bg-ink-950/80 dark:text-stone-200">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(f)}
                        disabled={disabled}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm backdrop-blur transition hover:bg-red-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 dark:bg-ink-950/80 dark:text-stone-200"
                        title="Remove photo"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Stock number — becomes the downloaded file's name. */}
                    <label className="flex items-center gap-1 border-t border-stone-100 px-2.5 py-1.5 dark:border-white/[0.06]">
                      <span className="font-mono text-[11px] text-stone-400">#</span>
                      <input
                        type="text"
                        value={stocks[key] || ''}
                        disabled={disabled}
                        onChange={(e) => onStockChange?.(key, e.target.value)}
                        placeholder="Stock #"
                        aria-label={`Stock number for ${f.name}`}
                        title="Stock number — used as the file name on download"
                        className="w-full min-w-0 bg-transparent font-mono text-xs font-medium text-stone-800 outline-none placeholder:font-sans placeholder:text-stone-400 dark:text-stone-100"
                      />
                    </label>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add-more tile keeps the picker reachable once the grid fills up. */}
            <button
              type="button"
              onClick={open}
              disabled={disabled}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-stone-300 text-xs font-medium text-stone-500 transition hover:border-stone-400 hover:bg-stone-50 hover:text-stone-800 disabled:opacity-60 dark:border-white/15 dark:text-stone-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
            >
              <Plus className="h-5 w-5" />
              Add more
            </button>
          </div>
        </>
      )}
    </div>
  );
}
