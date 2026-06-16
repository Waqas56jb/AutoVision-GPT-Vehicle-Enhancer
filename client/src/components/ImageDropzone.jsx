import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud, X, ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_MB } from '../constants/index.js';

/**
 * Reusable drag-and-drop image picker with preview.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.hint
 * @param {File|null} props.file
 * @param {(file:File|null)=>void} props.onChange
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 */
export default function ImageDropzone({ label, hint, file, onChange, required, disabled }) {
  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        const reason = rejected[0]?.errors?.[0]?.code;
        if (reason === 'file-too-large') toast.error(`Image must be under ${MAX_FILE_MB} MB.`);
        else if (reason === 'file-invalid-type') toast.error('Use a JPEG, PNG or WEBP image.');
        else toast.error('That file could not be added.');
        return;
      }
      if (accepted?.[0]) onChange(accepted[0]);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    multiple: false,
    disabled,
    noClick: Boolean(file),
  });

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          {label} {required && <span className="text-brand-400">*</span>}
        </label>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 transition',
          isDragActive
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-white/15 bg-white/[0.03] hover:border-brand-500/60 hover:bg-white/[0.06]',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-slate-800"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Change
            </button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-3 rounded-full bg-brand-500/15 p-3 text-brand-400 transition group-hover:scale-110">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="font-medium text-slate-200">
              {isDragActive ? 'Drop the image here' : 'Drag & drop, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
