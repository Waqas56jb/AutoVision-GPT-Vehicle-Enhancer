import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
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
  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        toast.error(`Some files were skipped (max ${MAX_FILE_MB} MB, images only).`);
      }
      if (accepted?.length) onChange([...files, ...accepted]);
    },
    [files, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    multiple: true,
    disabled,
  });

  const removeAt = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          Vehicle photos <span className="text-brand-400">*</span>
        </label>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="text-xs text-slate-400 transition hover:text-red-400"
          >
            Clear all ({files.length})
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition',
          isDragActive
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-white/15 bg-white/[0.03] hover:border-brand-500/60',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-2 rounded-full bg-brand-500/15 p-2.5 text-brand-400">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-slate-200">
          {isDragActive ? 'Drop the photos here' : 'Drag & drop, or click to add photos'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Add one or many (batch) · JPEG / PNG / WEBP · up to {MAX_FILE_MB} MB each
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
            >
              <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-1 text-white opacity-0 transition group-hover:opacity-100"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
