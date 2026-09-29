import { useEffect, useMemo, useRef, useState } from 'react';
import { compositeToBlob } from '../tags/renderTags.js';
import { tagsSignature } from '../tags/tagModel.js';

/**
 * Stage preview of a finished photo with its tags drawn on.
 *
 * Returns an object URL of the composite, or the untouched photo when it has no
 * tags. While a new composite renders (e.g. mid-edit), the previous one for the
 * SAME photo stays on screen so the preview never flashes back to untagged —
 * but a composite is never shown against a different photo.
 */
export function useComposite(src, tags) {
  const sig = useMemo(() => tagsSignature(tags), [tags]);
  const [state, setState] = useState({ url: null, src: null, sig: null });
  const current = useRef(null);

  useEffect(() => {
    if (!src || !tags?.length) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const blob = await compositeToBlob(src, tags, 'image/jpeg', 0.92);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const old = current.current;
        current.current = url;
        setState({ url, src, sig });
        // Revoke after the <img> has swapped to the new URL.
        if (old) setTimeout(() => URL.revokeObjectURL(old), 1500);
      } catch {
        /* leave the last good preview in place */
      }
    }, 70);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, sig]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    []
  );

  if (!src) return null;
  if (!tags?.length) return src;
  return state.src === src && state.url ? state.url : src;
}

export default useComposite;
