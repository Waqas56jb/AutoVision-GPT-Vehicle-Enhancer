import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Check, Trash2, Upload, ImageIcon, Sparkles } from 'lucide-react';
import {
  fetchBackgrounds,
  uploadBackground,
  deleteBackground,
} from '../api/backgrounds.api.js';
import { assetUrl } from '../api/client.js';
import { compressImage } from '../utils/compressImage.js';
import { Spinner, Skeleton } from './Loader.jsx';

/**
 * Full background library manager:
 *  - Upload many backgrounds (saved permanently on the server).
 *  - Delete saved backgrounds.
 *  - Select "Keep original", "Clean studio", or any saved background.
 *
 * @param {object} props
 * @param {string} props.value   'keep' | 'studio' | <presetId>
 * @param {(v:string)=>void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function BackgroundManager({ value, onChange, disabled }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef(null);

  const load = () =>
    fetchBackgrounds()
      .then(setPresets)
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      // Upload sequentially so the library stays ordered and errors are clear.
      // Compress first so large phone photos upload reliably.
      let lastId = null;
      for (const [i, f] of files.entries()) {
        let toSend = f;
        try {
          toSend = await compressImage(f);
        } catch {
          toSend = f;
        }
        const bg = await uploadBackground(toSend);
        lastId = bg.id;
        setUploadProgress({ done: i + 1, total: files.length });
      }
      await load();
      if (lastId) onChange(lastId);
      toast.success(`Saved ${files.length} background${files.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async (e, id) => {
    e.stopPropagation();
    if (disabled) return;
    try {
      await deleteBackground(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      if (value === id) onChange('studio');
      toast.success('Background deleted.');
    } catch (err) {
      toast.error(err?.message || 'Delete failed.');
    }
  };

  const OptionTile = ({ active, onClick, children, title }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
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
    <div>
      <div className="mb-2.5 flex items-center justify-between">
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {/* Two columns regardless of viewport — the drawer is a fixed 340px, so a
          `sm:` breakpoint would shrink these tiles on a wide screen. */}
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
          ? /* Placeholder tiles keep the grid from collapsing while the
               library loads — no layout jump when the real ones land. */
            Array.from({ length: 4 }, (_, i) => (
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
                  className={clsx(
                    'group relative aspect-[3/2] overflow-hidden rounded-2xl border transition duration-200',
                    active
                      ? 'border-brand-500 shadow-glow ring-2 ring-brand-500'
                      : 'border-brand-100 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft'
                  )}
                  title={p.name}
                >
                  <img
                    src={assetUrl(p.url)}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-slate-900/80 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white">
                    {p.name}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 shadow-glow"
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.span>
                  )}
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => onDelete(e, p.id)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow-soft transition hover:bg-red-500 hover:text-white group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </motion.button>
              );
            })}
      </div>
    </div>
  );
}
