import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Check, Trash2, Upload, ImageIcon, Sparkles, HardDrive, Lock } from 'lucide-react';
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
        builtIn: Boolean(p.builtIn),
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
        builtIn: false,
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

  const OptionTile = ({ active, onClick, icon: Icon, title, hint }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'tile flex items-center gap-3 px-3 py-3 text-left',
        active ? 'tile-active' : 'tile-idle',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full',
          active ? 'bg-ink-900 text-white dark:bg-brand-300 dark:text-ink-950' : 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block truncate text-[11px] text-stone-400">{hint}</span>
      </span>
    </button>
  );

  const builtIns = presets.filter((p) => p.builtIn);
  const uploads = presets.filter((p) => !p.builtIn);

  const renderScene = (p, i) => {
    const active = value === p.id;
    return (
      <motion.div
        key={p.id}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
        className="group relative"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.id)}
          aria-pressed={active}
          aria-label={p.name}
          title={p.name}
          className={clsx(
            'relative block aspect-[3/2] w-full overflow-hidden rounded-xl transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
            active
              ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-white dark:ring-offset-ink-900'
              : 'ring-1 ring-black/5 hover:-translate-y-px hover:shadow-soft dark:ring-white/10',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <img
            src={p.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
          />
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-left text-[10.5px] font-medium text-white">
            {p.name}
          </span>
          {active && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow"
            >
              <Check className="h-3 w-3 text-brand-700" strokeWidth={3} />
            </motion.span>
          )}
        </button>
        {/* A sibling of the select button — never nested inside it. */}
        {p.builtIn ? (
          <span
            className="pointer-events-none absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-stone-500 shadow-sm backdrop-blur"
            title="Built-in scene — always available"
          >
            <Lock className="h-3 w-3" />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => !disabled && setPendingDelete(p)}
            className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm backdrop-blur transition hover:bg-red-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            title="Delete this background"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    );
  };

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
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border border-dashed border-brand-400 bg-brand-50/90 text-sm font-semibold text-brand-800 backdrop-blur dark:bg-ink-900/90 dark:text-brand-200">
          Drop scenes to save them
        </div>
      )}

      {/* The chosen scene, large. */}
      <div className="relative mb-4 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10" aria-live="polite">
        {selectedPreset?.url ? (
          <img src={selectedPreset.url} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center bg-gradient-to-b from-stone-100 to-stone-200 dark:from-white/[0.06] dark:to-white/[0.02]">
            {value === 'keep' ? (
              <ImageIcon className="h-7 w-7 text-stone-400" />
            ) : (
              <Sparkles className="h-7 w-7 text-brand-500" />
            )}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3.5 pb-3 pt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Current scene</p>
          <p className="truncate text-sm font-semibold text-white">{currentLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <OptionTile
          active={value === 'studio'}
          onClick={() => onChange('studio')}
          icon={Sparkles}
          title="Clean studio"
          hint="Soft grey sweep"
        />
        <OptionTile
          active={value === 'keep'}
          onClick={() => onChange('keep')}
          icon={ImageIcon}
          title="Keep original"
          hint="As shot, cleaned"
        />
      </div>

      <p className="micro mb-2.5 mt-6">Showroom scenes</p>
      <div className="grid grid-cols-2 gap-2.5">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[3/2] rounded-xl" />)
          : builtIns.map(renderScene)}
      </div>

      <div className="mb-2.5 mt-6 flex items-center justify-between gap-2">
        <p className="micro flex items-center gap-1.5">
          <HardDrive className="h-3 w-3" /> Your scenes
        </p>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="btn-ghost h-8 px-3 text-xs"
        >
          {uploading ? <Spinner size="xs" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? `Saving ${uploadProgress.done}/${uploadProgress.total}…` : 'Upload'}
        </button>
      </div>
      {!loading && uploads.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center transition hover:border-stone-400 hover:bg-stone-50 dark:border-white/15 dark:hover:bg-white/[0.04]"
        >
          <Upload className="h-4 w-4 text-stone-500" />
          <span className="text-xs font-medium text-stone-700 dark:text-stone-200">
            Upload your dealership’s backgrounds
          </span>
          <span className="text-[11px] text-stone-400">Saved on this device — they stay after a refresh</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">{uploads.map(renderScene)}</div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
        Interior and close-up photos ignore the scene automatically — only exteriors are placed into it.
      </p>

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
