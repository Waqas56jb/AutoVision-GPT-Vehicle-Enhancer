import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Check, ImageDown } from 'lucide-react';
import ImageDropzone from './ImageDropzone.jsx';
import { fetchBackgrounds } from '../api/backgrounds.api.js';
import { assetUrl } from '../api/client.js';

/**
 * Lets the dealer either UPLOAD a background per job, or pick one of the
 * predefined SAVED backgrounds preloaded on the server.
 *
 * @param {object} props
 * @param {File|null} props.file            uploaded background file
 * @param {(f:File|null)=>void} props.onFileChange
 * @param {string} props.selectedId         chosen preset id ('' = none)
 * @param {(id:string)=>void} props.onSelectId
 * @param {boolean} [props.disabled]
 */
export default function BackgroundPicker({ file, onFileChange, selectedId, onSelectId, disabled }) {
  const [tab, setTab] = useState('saved'); // 'saved' | 'upload'
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchBackgrounds()
      .then((list) => alive && setPresets(list))
      .catch(() => alive && setPresets([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const choosePreset = (id) => {
    if (disabled) return;
    onFileChange(null); // presets and uploads are mutually exclusive
    onSelectId(selectedId === id ? '' : id);
  };

  const chooseUpload = (f) => {
    onSelectId('');
    onFileChange(f);
  };

  const TabBtn = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={clsx(
        'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
        tab === id ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-white/10'
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">Background</label>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <TabBtn id="saved" label="Saved" />
          <TabBtn id="upload" label="Upload" />
        </div>
      </div>

      {tab === 'saved' ? (
        <div>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading backgrounds…</p>
          ) : presets.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
              No saved backgrounds yet. Drop images into <code>server/backgrounds/</code> or use Upload.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {/* Studio / none option */}
              <button
                type="button"
                onClick={() => {
                  onFileChange(null);
                  onSelectId('');
                }}
                className={clsx(
                  'flex aspect-[3/2] flex-col items-center justify-center rounded-lg border text-center text-xs transition',
                  !selectedId && !file
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25'
                )}
              >
                <ImageDown className="mb-1 h-5 w-5" />
                Clean studio
              </button>

              {presets.map((p) => {
                const active = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => choosePreset(p.id)}
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
                      <span className="absolute right-1 top-1 rounded-full bg-brand-500 p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <ImageDropzone
          label="Upload background"
          hint="Leave empty for a clean studio backdrop"
          file={file}
          onChange={chooseUpload}
          disabled={disabled}
        />
      )}
    </div>
  );
}
