import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Copy, Trash2, Download, Upload, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import TagPreview from './TagPreview.jsx';
import TagEditor from './TagEditor.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import { APPLY_RULES, describeTag } from '../../tags/tagModel.js';

/**
 * The "Marketing tags" drawer: the saved tag library, or the editor when a tag
 * is being created / changed.
 */
export default function TagLibrary({ library, editing, onEdit, onNew, onDraftChange, onSave, onCancel, previewSrc }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const importInput = useRef(null);
  const { tags, fonts } = library;

  if (editing) {
    return (
      <TagEditor
        draft={editing.draft}
        isNew={editing.isNew}
        onChange={onDraftChange}
        onSave={onSave}
        onCancel={onCancel}
        fonts={fonts}
        onAddFont={library.addFont}
        previewSrc={previewSrc}
      />
    );
  }

  const onImport = async (file) => {
    if (!file) return;
    try {
      const n = await library.importLibrary(file);
      toast.success(`Imported ${n} tag${n === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err.message || 'Import failed.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-[11px] leading-relaxed text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300">
        Tags go on top of the finished photos. Pick the corner, the photos, the colours, fonts and
        logo — and change them any time. <b>No re-render and no extra cost.</b>
      </p>

      <button type="button" onClick={onNew} className="btn-primary w-full">
        <Plus className="h-4 w-4" /> New tag
      </button>

      {library.ready && tags.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-brand-100 px-4 py-6 text-center dark:border-white/10">
          <Sparkles className="mb-2 h-6 w-6 text-brand-400" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">No tags yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
            Make a corner warranty tag, a header, a footer — or upload a tag your team already
            designed.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {tags.map((tag) => (
            <motion.article
              key={tag.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-soft dark:border-white/10 dark:bg-ink-800"
            >
              <button type="button" onClick={() => onEdit(tag)} className="block w-full" title="Edit tag">
                <TagPreview src={previewSrc} tags={[tag]} width={480} />
              </button>
              <div className="flex items-center gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-800 dark:text-stone-100">{tag.name}</p>
                  <p className="truncate text-[11px] text-stone-400">
                    {describeTag(tag)} ·{' '}
                    <span className="font-semibold text-brand-600 dark:text-brand-300">
                      {APPLY_RULES.find((r) => r.value === tag.applyTo)?.label}
                    </span>
                  </p>
                </div>
                <button type="button" onClick={() => onEdit(tag)} className="btn-ghost h-8 w-8 px-0" title="Edit" aria-label={`Edit ${tag.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    library.duplicateTag(tag);
                    toast.success('Tag duplicated.');
                  }}
                  className="btn-ghost h-8 w-8 px-0"
                  title="Duplicate"
                  aria-label={`Duplicate ${tag.name}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(tag)}
                  className="btn-ghost h-8 w-8 px-0 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                  aria-label={`Delete ${tag.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-brand-100 pt-4 dark:border-white/10">
        <p className="micro mb-2">Share with your team</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={library.exportLibrary}
            disabled={!tags.length}
            className="btn-ghost h-9 flex-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export tags
          </button>
          <button type="button" onClick={() => importInput.current?.click()} className="btn-ghost h-9 flex-1 text-xs">
            <Upload className="h-3.5 w-3.5" /> Import tags
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          Tags are saved in this browser. Export them to a file and import it on another computer
          so every photographer uses the same tags.
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this tag?"
        message={`“${confirmDelete?.name}” will be removed from every photo. This cannot be undone.`}
        confirmLabel="Delete tag"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          library.removeTag(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
