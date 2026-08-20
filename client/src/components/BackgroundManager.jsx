import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Check, Trash2, Upload, ImageIcon, Sparkles, HardDrive } from 'lucide-react';
import {
  fetchBackgrounds,
  uploadBackground,
  deleteBackground as deleteServerBackground,
} from '../api/backgrounds.api.js';
import { assetUrl } from '../api/client.js';
import { compressImage } from '../utils/compressImage.js';
import {
  saveBackground,
  listStoredBackgrounds,
  deleteStoredBackground,
} from '../utils/backgroundStorage.js';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_MB } from '../constants/index.js';
import { Spinner, Skeleton } from './Loader.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

/**
 * Full background library manager:
 *  - Upload many backgrounds (saved on this device in IndexedDB, and to the
 *    server when it can persist them).
 *  - Delete saved backgrounds.
 *  - Select "Keep original", "Clean studio", or any saved background.
 *
 * User uploads survive refresh because the blob is stored in IndexedDB — not
 * only as a temporary object URL, and not only on an ephemeral server disk.
 */

function prettyName(file) {
  return String(file || 'Background')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Background';
}

export default function BackgroundManager({ value, onChange, disabled }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const blobUrls = useRef([]);
  const fileRef = useRef(null);
  const loadGen = useRef(0);

  const revokeBlobUrls = () => {
    blobUrls.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrls.current = [];
  };

  const load = useCallback(async () => {
    const my = ++loadGen.current;
    let remote = [];
    try {
      remote = await fetchBackgrounds();
    } catch {
      remote = [];
    }

    let local = [];
    try {
      local = await listStoredBackgrounds();
    } catch {
      local = [];
    }

    if (my !== loadGen.current) return [];

    revokeBlobUrls();
    const byId = new Map();

    remote.forEach((p) => {
      byId.set(p.id, {
        id: p.id,
        name: p.name,
        url: assetUrl(p.url),
        persisted: false,
        localOnly: false,
      });
    });

    local.forEach((rec) => {
      const url = URL.createObjectURL(rec.blob);
      blobUrls.current.push(url);
      byId.set(rec.id, {
        id: rec.id,
        name: rec.name || prettyName(rec.fileName || rec.id),
        url,
        persisted: true,
        localOnly: !remote.some((p) => p.id === rec.id),
      });
    });

    if (my !== loadGen.current) {
      revokeBlobUrls();
      return [];
    }

    const next = Array.from(byId.values());
    setPresets(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    load();
    return () => {
      loadGen.current += 1;
      revokeBlobUrls();
    };
  }, [load]);

  /* If the restored selection no longer exists, fall back to studio. */
  useEffect(() => {
    if (loading) return;
    if (value === 'keep' || value === 'studio') return;
    if (!presets.some((p) => p.id === value)) onChange('studio');
  }, [loading, presets, value, onChange]);

  const persistFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      let lastId = null;
      let serverFailed = 0;
      for (const [i, f] of files.entries()) {
        let toSend = f;
        try {
          toSend = await compressImage(f);
        } catch {
          toSend = f;
        }

        let id = `local-${Date.now().toString(36)}-${i}`;
        let serverUrl = null;
        try {
          const bg = await uploadBackground(toSend);
          id = bg.id;
          serverUrl = bg.url;
        } catch {
          serverFailed += 1;
        }

        try {
          await saveBackground({
            id,
            name: prettyName(f.name),
            fileName: toSend.name || f.name,
            mimeType: toSend.type || 'image/jpeg',
            blob: toSend,
            serverUrl,
            createdAt: Date.now(),
          });
        } catch (err) {
          if (!serverUrl) throw err;
          toast.error('Saved on the server, but this device could not remember it.');
        }

        lastId = id;
        setUploadProgress({ done: i + 1, total: files.length });
      }
      await load();
      if (lastId) onChange(lastId);
      if (serverFailed && serverFailed === files.length) {
        toast.success(
          `Saved ${files.length} background${files.length === 1 ? '' : 's'} on this device. They will survive refresh.`
        );
      } else if (serverFailed) {
        toast.success(`Saved ${files.length} backgrounds (${serverFailed} on this device only).`);
      } else {
        toast.success(`Saved ${files.length} background${files.length === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not save that background. Try a smaller JPEG or PNG.');
    } finally {
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = useCallback(
    (accepted, rejected) => {
      if (disabled || uploading) return;
      if (rejected?.length) {
        toast.error(`Some files were skipped (max ${MAX_FILE_MB} MB, images only).`);
      }
      if (accepted?.length) persistFiles(accepted);
    },
    // persistFiles is recreated each render; the disabled/uploading guards are enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, uploading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_MB * 1024 * 1024,
    multiple: true,
    disabled: disabled || uploading,
    noClick: true,
    noKeyboard: true,
  });

  const confirmDelete = async () => {
    const id = pendingDelete?.id;
    setPendingDelete(null);
    if (!id || disabled) return;
    try {
      await deleteStoredBackground(id);
      try {
        await deleteServerBackground(id);
      } catch {
        /* local-only entries 404 on the server — that is expected */
      }
      setPresets((prev) => prev.filter((p) => p.id !== id));
      if (value === id) onChange('studio');
      toast.success('Background removed.');
    } catch (err) {
      toast.error(err?.message || 'Delete failed.');
    }
  };

  const selectedPreset = presets.find((p) => p.id === value);
  const currentLabel =
    value === 'keep' ? 'Original scene kept' : value === 'studio' ? 'Clean studio' : selectedPreset?.name || 'Saved scene';

  const OptionTile = ({ active, onClick, children, title }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={clsx(
        'tile flex aspect-[3/2] flex-col items-center justify-center gap-1 text-center text-xs font-medium',
        active ? 'tile-active' : 'tile-idle',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      {children}
    </button>
  );

  return (
    <div {...getRootProps({ className: 'relative outline-none' })}>
      <input {...getInputProps()} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => persistFiles(e.target.files)}
      />

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/90 text-sm font-bold text-brand-800 dark:bg-ink-900/90 dark:text-brand-200">
          Drop scenes to save them on this device
        </div>
      )}

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <label className="label">Background</label>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="btn-ghost px-2.5 py-1.5 text-xs"
        >
          {uploading ? <Spinner size="xs" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading
            ? `Saving ${uploadProgress.done}/${uploadProgress.total}…`
            : 'Upload backgrounds'}
        </button>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Uploads are saved on this device and survive refresh. Interior and close-up
        photos ignore the scene automatically — only exteriors are composited.
      </p>

      <div
        className="mb-3 flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/50 px-2.5 py-2 dark:border-white/10 dark:bg-white/5"
        aria-live="polite"
      >
        {selectedPreset?.url ? (
          <img
            src={selectedPreset.url}
            alt=""
            className="h-9 w-12 shrink-0 rounded-lg object-cover ring-1 ring-brand-100 dark:ring-white/10"
          />
        ) : (
          <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-brand-100 dark:bg-ink-800 dark:ring-white/10">
            {value === 'keep' ? (
              <ImageIcon className="h-4 w-4 text-brand-600" />
            ) : (
              <Sparkles className="h-4 w-4 text-brand-600" />
            )}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current scene</p>
          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{currentLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <OptionTile
          active={value === 'keep'}
          onClick={() => onChange('keep')}
          title="Keep the original background"
        >
          <ImageIcon className="h-5 w-5" />
          Keep original
        </OptionTile>
        <OptionTile
          active={value === 'studio'}
          onClick={() => onChange('studio')}
          title="Clean studio backdrop"
        >
          <Sparkles className="h-5 w-5" />
          Clean studio
        </OptionTile>

        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />
            ))
          : presets.map((p, i) => {
              const active = value === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                  disabled={disabled}
                  onClick={() => onChange(p.id)}
                  aria-pressed={active}
                  aria-label={p.name}
                  className={clsx(
                    'group relative aspect-[3/2] overflow-hidden rounded-2xl border transition duration-200',
                    active
                      ? 'border-brand-500 shadow-glow ring-2 ring-brand-500'
                      : 'border-brand-100 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft dark:border-white/10',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                  title={p.name}
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-slate-900/80 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white">
                    {p.name}
                  </span>
                  {p.persisted && (
                    <span
                      className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-brand-700 shadow-soft"
                      title="Saved on this device"
                    >
                      <HardDrive className="h-3 w-3" />
                    </span>
                  )}
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={clsx(
                        'absolute grid h-5 w-5 place-items-center rounded-full bg-brand-600 shadow-glow',
                        p.persisted ? 'left-7 top-1.5' : 'left-1.5 top-1.5'
                      )}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) setPendingDelete(p);
                    }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow-soft transition hover:bg-red-500 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
                    title="Delete"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.button>
              );
            })}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this background?"
        message={
          pendingDelete
            ? `“${pendingDelete.name}” will be deleted from this device. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
