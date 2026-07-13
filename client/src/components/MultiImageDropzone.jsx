import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadCloud, X, ImagePlus } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_MB } from '../constants/index.js';

/**
 * Multi-file image picker for batch vehicle uploads (1–100 images).
 *
 * @param {object} props
 * @param {File[]} props.files
 * @param {(files:File[])=>void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function MultiImageDropzone({ files, onChange, disabled }) {
  /* Object URLs are created once per file and revoked when it goes away —
     building them inline during render leaks a blob on every keystroke. */
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        toast.error(`Some files were skipped (max ${MAX_FILE_MB} MB, images only).`);
      }
      if (accepted?.length) onChange([...files, ...accepted]);
    },
    [files, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    multiple: true,
    disabled,
  });

  const removeAt = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="label">
          Vehicle photos <span className="text-brand-500">*</span>
        </label>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            Clear all ({files.length})
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'group relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition duration-300',
          isDragActive
            ? 'scale-[1.01] border-brand-500 bg-brand-50 shadow-glow'
            : 'border-brand-200 bg-white/60 hover:border-brand-400 hover:bg-brand-50/50',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.12, y: -3 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="relative mb-3"
        >
          {isDragActive && (
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand-400/40" />
          )}
          <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <UploadCloud className="h-6 w-6" />
          </span>
        </motion.div>

        <p className="text-sm font-semibold text-slate-700">
          {isDragActive ? 'Drop the photos here' : 'Drag & drop, or click to add photos'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          One or many (batch) · JPEG / PNG / WEBP · up to {MAX_FILE_MB} MB each
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <AnimatePresence mode="popLayout">
            {files.map((f, i) => (
              <motion.div
                key={`${f.name}-${f.lastModified}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="group relative aspect-square overflow-hidden rounded-xl border border-brand-100 bg-brand-50 shadow-soft"
              >
                {previews[i] && (
                  <img
                    src={previews[i]}
                    alt={f.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-brand-900/0 transition group-hover:bg-brand-900/25" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow-soft transition hover:bg-red-500 hover:text-white group-hover:opacity-100"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add-more tile keeps the picker reachable once the grid fills up. */}
          <button
            type="button"
            onClick={open}
            disabled={disabled}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-200 bg-white/60 text-xs font-medium text-brand-500 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
          >
            <ImagePlus className="h-5 w-5" />
            Add more
          </button>
        </div>
      )}
    </div>
  );
}
