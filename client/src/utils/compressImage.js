/**
 * Client-side image compression.
 *
 * Why: Vercel serverless functions reject request bodies larger than ~4.5 MB.
 * Modern phone photos can be 10–25 MB, so we downscale + re-encode in the
 * browser BEFORE upload. This keeps uploads under the limit and much faster,
 * while the backend (sharp) still does its own normalisation.
 *
 * EXIF orientation is honoured via { imageOrientation: 'from-image' }.
 *
 * @param {File} file
 * @param {object} [opts]
 * @param {number} [opts.maxEdge=2048]  longest edge in px
 * @param {number} [opts.quality=0.9]   JPEG quality (0–1)
 * @returns {Promise<File>} a compressed JPEG File (or the original on failure)
 */
export async function compressImage(file, { maxEdge = 2048, quality = 0.9 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxEdge / longest);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    // If compression somehow made it bigger and the original was already small,
    // keep whichever is smaller.
    if (blob.size >= file.size && file.size < 4 * 1024 * 1024) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    // createImageBitmap unsupported / decode failed → fall back to original.
    return file;
  }
}

export default compressImage;
