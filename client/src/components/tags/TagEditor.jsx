import { useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Image as ImageIcon,
  PanelTop,
  PanelBottom,
  Rows3,
  Upload,
  Trash2,
  Check,
  Loader2,
  Type,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import TagPreview from './TagPreview.jsx';
import {
  TAG_TYPES,
  CORNERS,
  APPLY_RULES,
  FONTS,
  BRAND_PRESETS,
  COLOR_FIELDS,
  SIZE_RANGE,
  HEADER_RANGE,
  FOOTER_RANGE,
  applyBrandPreset,
} from '../../tags/tagModel.js';
import { fileToTagImage } from '../../tags/assets.js';

const TYPE_ICONS = {
  card: BadgeCheck,
  image: ImageIcon,
  header: PanelTop,
  footer: PanelBottom,
  headerFooter: Rows3,
};

/* Transparency checkerboard, so a logo's real edges are visible. */
const CHECKER = {
  backgroundImage: 'conic-gradient(#e5e7eb 25%, #ffffff 0 50%, #e5e7eb 0 75%, #ffffff 0)',
  backgroundSize: '12px 12px',
};

function Section({ title, children, hint }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="micro">{title}</h3>
        {hint && <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Slider({ label, value, min, max, onChange, disabled }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
          {Math.round(value * 100)}%
        </span>
      </span>
      <input
        type="range"
        min={Math.round(min * 100)}
        max={Math.round(max * 100)}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-brand-600"
      />
    </label>
  );
}

function ColorRow({ label, value, onChange }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  const commit = (v) => {
    const t = v.trim();
    const hex = t.startsWith('#') ? t : `#${t}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toLowerCase());
    else setText(value);
  };
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-brand-100 bg-white p-0.5 dark:border-white/10 dark:bg-ink-800"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
        maxLength={7}
        aria-label={`${label} hex`}
        className="field w-[88px] shrink-0 px-2 py-1.5 font-mono text-xs uppercase"
      />
    </div>
  );
}

/** Upload / replace / remove one image asset (logo or finished graphic). */
function AssetPicker({ label, value, onChange, maxDim, hint, checkered }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToTagImage(file, maxDim));
    } catch (err) {
      toast.error(err.message || 'Could not use that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-100 p-2 dark:border-white/10">
          <div
            className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 dark:bg-white/10"
            style={checkered ? CHECKER : undefined}
          >
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex flex-1 flex-wrap gap-1.5">
            <button type="button" onClick={() => input.current?.click()} className="btn-ghost h-8 px-2.5 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn-ghost h-8 px-2.5 text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-200 bg-white/60 px-3 py-4 text-center transition hover:border-brand-400 hover:bg-brand-50 dark:border-white/15 dark:bg-ink-800/60 dark:hover:bg-white/5"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          ) : (
            <Upload className="h-5 w-5 text-brand-500" />
          )}
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</span>
          {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
        </button>
      )}
    </div>
  );
}

/** Four-corner picker drawn as a tiny photo frame. */
function CornerPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CORNERS.map((c) => {
        const on = value === c.value;
        const [v, h] = c.value.split('-');
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            aria-pressed={on}
            className={clsx('tile flex items-center gap-2.5 px-2.5 py-2', on ? 'tile-active' : 'tile-idle')}
          >
            <span className="relative block aspect-[3/2] w-10 shrink-0 rounded-[4px] border border-stone-300 bg-stone-100 dark:border-white/20 dark:bg-white/10">
              <span
                className={clsx(
                  'absolute h-2 w-3.5 rounded-[2px]',
                  on ? 'bg-brand-600' : 'bg-stone-400',
                  v === 'top' ? 'top-0.5' : 'bottom-0.5',
                  h === 'left' ? 'left-0.5' : 'right-0.5'
                )}
              />
            </span>
            <span className="text-xs font-semibold">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Create / edit one tag. Every change is live: the small preview here and the
 * big stage preview both redraw as the operator types.
 */
export default function TagEditor({
  draft,
  isNew,
  onChange,
  onSave,
  onCancel,
  fonts,
  onAddFont,
  previewSrc,
}) {
  const fontInput = useRef(null);
  const [fontBusy, setFontBusy] = useState(false);
  // Functional updates: an upload that resolves later must not undo typing done meanwhile.
  const set = (patch) => onChange((d) => ({ ...d, ...patch }));
  const setColor = (k, v) => onChange((d) => ({ ...d, colors: { ...d.colors, [k]: v } }));

  const { type } = draft;
  const isCorner = type === 'card' || type === 'image';
  const hasHeader = type === 'header' || type === 'headerFooter';
  const hasFooter = type === 'footer' || type === 'headerFooter';
  const hasTitle = type === 'card' || hasHeader;
  const hasFooterText = type === 'card' || hasFooter;
  const hasLogo = type === 'card' || hasHeader;
  const canSave = type !== 'image' || Boolean(draft.graphic);

  const onFontFile = async (file) => {
    if (!file) return;
    setFontBusy(true);
    try {
      const rec = await onAddFont(file);
      set({ font: rec.family });
      toast.success(`Font “${rec.label}” added.`);
    } catch (err) {
      toast.error(err.message || 'Could not add that font.');
    } finally {
      setFontBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-stone-500 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All tags
        </button>
        <span className="micro">{isNew ? 'New tag' : 'Editing'}</span>
      </div>

      <div>
        <div className="overflow-hidden rounded-xl border border-brand-100 shadow-soft dark:border-white/10">
          <TagPreview src={previewSrc} tags={[draft]} width={640} />
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">
          {previewSrc
            ? 'Live on the selected photo — the stage shows it full size.'
            : 'Live on a sample photo. Generate a photo to preview it for real.'}
        </p>
      </div>

      <label className="block">
        <span className="label mb-1.5 block">Tag name</span>
        <input
          type="text"
          value={draft.name}
          maxLength={60}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Kia 7-year warranty"
          className="field py-2"
        />
      </label>

      <Section title="Tag style">
        <div className="grid grid-cols-2 gap-2">
          {TAG_TYPES.map(({ value, label, hint }) => {
            const Icon = TYPE_ICONS[value];
            const on = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => set({ type: value })}
                aria-pressed={on}
                className={clsx(
                  'tile flex flex-col items-start gap-1 px-2.5 py-2 text-left',
                  on ? 'tile-active' : 'tile-idle',
                  value === 'headerFooter' && 'col-span-2'
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Icon className="h-4 w-4" /> {label}
                </span>
                <span className="text-[10.5px] leading-snug text-stone-400">{hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {type !== 'image' && (
        <Section title="Start from a brand" hint="Fills in wording and colours. You can change everything after.">
          <select
            value=""
            onChange={(e) => {
              const key = e.target.value;
              if (key) onChange((d) => applyBrandPreset(d, key));
            }}
            className="field py-2"
          >
            <option value="">Choose a brand…</option>
            {BRAND_PRESETS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </Section>
      )}

      {isCorner && (
        <Section title="Corner">
          <CornerPicker value={draft.corner} onChange={(corner) => set({ corner })} />
          <Slider
            label={type === 'image' ? 'Graphic width' : 'Tag width'}
            value={draft.size}
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            onChange={(size) => set({ size })}
          />
        </Section>
      )}

      {(hasHeader || hasFooter) && (
        <Section title="Band size">
          {hasHeader && (
            <Slider
              label="Header height"
              value={draft.headerSize}
              min={HEADER_RANGE.min}
              max={HEADER_RANGE.max}
              onChange={(headerSize) => set({ headerSize })}
            />
          )}
          {hasFooter && (
            <Slider
              label="Footer height"
              value={draft.footerSize}
              min={FOOTER_RANGE.min}
              max={FOOTER_RANGE.max}
              onChange={(footerSize) => set({ footerSize })}
            />
          )}
          <Slider
            label="Band opacity"
            value={draft.bandOpacity}
            min={0.5}
            max={1}
            onChange={(bandOpacity) => set({ bandOpacity })}
          />
        </Section>
      )}

      {type === 'image' && (
        <Section
          title="Your tag graphic"
          hint="Upload a tag your team already designed (like the Kia or LDV ones). A PNG with a transparent background looks best."
        >
          <AssetPicker
            label="Upload tag graphic"
            hint="PNG · JPG · WEBP · SVG"
            value={draft.graphic}
            maxDim={1600}
            checkered
            onChange={(graphic) => set({ graphic })}
          />
        </Section>
      )}

      {hasLogo && (
        <Section title="Brand logo">
          <AssetPicker
            label="Upload logo"
            hint="PNG with transparent background works best"
            value={draft.logo}
            maxDim={900}
            checkered
            onChange={(logo) => set({ logo })}
          />
          {hasHeader && draft.logo && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={draft.logoPlate}
                onChange={(e) => set({ logoPlate: e.target.checked })}
                className="h-4 w-4 rounded accent-brand-600"
              />
              White plate behind the logo (keeps dark logos visible)
            </label>
          )}
          {hasHeader && draft.logo && (
            <div className="grid grid-cols-2 gap-2">
              {['left', 'right'].map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => set({ logoSide: side })}
                  aria-pressed={draft.logoSide === side}
                  className={clsx(
                    'tile px-2 py-1.5 text-xs font-semibold capitalize',
                    draft.logoSide === side ? 'tile-active' : 'tile-idle'
                  )}
                >
                  Logo {side}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {(hasTitle || hasFooterText) && (
        <Section title="Wording">
          {hasTitle && (
            <>
              <input
                type="text"
                value={draft.title}
                maxLength={80}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Title — e.g. 7 Year Factory Warranty"
                aria-label="Title"
                className="field py-2"
              />
              <input
                type="text"
                value={draft.subtitle}
                maxLength={120}
                onChange={(e) => set({ subtitle: e.target.value })}
                placeholder="Subtitle (optional)"
                aria-label="Subtitle"
                className="field py-2"
              />
            </>
          )}
          {hasFooterText && (
            <>
              <input
                type="text"
                value={draft.footer}
                maxLength={90}
                onChange={(e) => set({ footer: e.target.value })}
                placeholder={type === 'card' ? 'Bottom strip (leave empty for none)' : 'Footer text'}
                aria-label={type === 'card' ? 'Bottom strip text' : 'Footer text'}
                className="field py-2"
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={draft.uppercaseFooter}
                  onChange={(e) => set({ uppercaseFooter: e.target.checked })}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                {type === 'card' ? 'Strip text in CAPITALS' : 'Footer in CAPITALS'}
              </label>
            </>
          )}
        </Section>
      )}

      {type !== 'image' && (
        <Section title="Font">
          <select
            value={draft.font}
            onChange={(e) => set({ font: e.target.value })}
            className="field py-2"
            style={{ fontFamily: `"${draft.font}", Inter, sans-serif` }}
          >
            <optgroup label="Built-in">
              {FONTS.map((f) => (
                <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>
                  {f.label}
                </option>
              ))}
            </optgroup>
            {fonts.length > 0 && (
              <optgroup label="Your fonts">
                {fonts.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            )}
            {!FONTS.some((f) => f.family === draft.font) &&
              !fonts.some((f) => f.family === draft.font) && (
                <option value={draft.font}>Missing font (upload it again)</option>
              )}
          </select>
          <input
            ref={fontInput}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={(e) => {
              onFontFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fontInput.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:text-brand-800 dark:text-brand-300"
          >
            {fontBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Type className="h-3.5 w-3.5" />}
            Upload your own font (.ttf / .otf / .woff)
          </button>
        </Section>
      )}

      {COLOR_FIELDS[type].length > 0 && (
        <Section title="Colours">
          <div className="space-y-2">
            {COLOR_FIELDS[type].map(([key, label]) => (
              <ColorRow key={key} label={label} value={draft.colors[key]} onChange={(v) => setColor(key, v)} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Put this tag on" hint="You can still switch it on or off for any single photo in the right-hand panel.">
        <div className="grid grid-cols-2 gap-2">
          {APPLY_RULES.map((r) => {
            const on = draft.applyTo === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => set({ applyTo: r.value })}
                aria-pressed={on}
                className={clsx('tile flex flex-col items-start px-2.5 py-2 text-left', on ? 'tile-active' : 'tile-idle')}
              >
                <span className="text-xs font-bold">{r.label}</span>
                <span className="text-[10.5px] text-stone-400">{r.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 flex gap-2 border-t border-brand-100 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-ink-900/95">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          title={canSave ? undefined : 'Upload a tag graphic first'}
          className="btn-primary flex-[2]"
        >
          <Check className="h-4 w-4" /> {isNew ? 'Save tag' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
