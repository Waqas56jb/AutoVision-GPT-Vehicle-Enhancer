import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Check, Trash2, Upload, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import {
  fetchBackgrounds,
  uploadBackground,
  deleteBackground,
} from '../api/backgrounds.api.js';
import { assetUrl } from '../api/client.js';

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
    try {
      // Upload sequentially so the library stays ordered and errors are clear.
      let lastId = null;
      for (const f of files) {
        const bg = await uploadBackground(f);
        lastId = bg.id;
      }
      await load();
      if (lastId) onChange(lastId);
      toast.success(`Saved ${files.length} background${files.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
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
        'flex aspect-[3/2] flex-col items-center justify-center rounded-lg border text-center text-xs transition',
        active
          ? 'border-brand-500 bg-brand-500/15 text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">Background</label>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Saving…' : 'Upload backgrounds'}
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <OptionTile active={value === 'keep'} onClick={() => onChange('keep')} title="Keep the original background">
          <ImageIcon className="mb-1 h-5 w-5" />
          Keep original
        </OptionTile>
        <OptionTile active={value === 'studio'} onClick={() => onChange('studio')} title="Clean studio backdrop">
          <Sparkles className="mb-1 h-5 w-5" />
          Clean studio
        </OptionTile>

        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-4 text-sm text-slate-500 sm:col-span-1">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          presets.map((p) => {
            const active = value === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(p.id)}
                className={clsx(
                  'group relative aspect-[3/2] overflow-hidden rounded-lg border transition',
                  active ? 'border-brand-500 ring-2 ring-brand-500' : 'border-white/10 hover:border-white/30'
                )}
                title={p.name}
              >
                <img src={assetUrl(p.url)} alt={p.name} className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-slate-950/70 px-1.5 py-1 text-[10px] text-slate-200">
                  {p.name}
                </span>
                {active && (
                  <span className="absolute left-1 top-1 rounded-full bg-brand-500 p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <span
                  onClick={(e) => onDelete(e, p.id)}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
