import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { drawComposite } from '../../tags/renderTags.js';
import { tagsSignature } from '../../tags/tagModel.js';

/**
 * Small live preview: a photo (or a neutral sample scene) with tags drawn on,
 * using the exact renderer the downloads use.
 */
export default function TagPreview({ src, tags, width = 640, className }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const sig = useMemo(() => tagsSignature(tags), [tags]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let live = true;
    const t = setTimeout(() => {
      drawComposite(canvas, src || null, tags, { width, isCurrent: () => live })
        .then((drawn) => drawn && live && setReady(true))
        .catch(() => {});
    }, 40);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, sig, width]);

  return (
    <div className="relative">
      <canvas
        ref={ref}
        width={width}
        height={Math.round((width * 853) / 1280)}
        className={clsx('block h-auto w-full bg-stone-100 dark:bg-white/5', className)}
      />
      {/* A large photo takes a moment to decode — shimmer instead of a blank box. */}
      {!ready && <div className="skeleton absolute inset-0" />}
    </div>
  );
}
