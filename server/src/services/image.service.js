import sharp from 'sharp';

/**
 * Image pre/post-processing helpers built on sharp.
 * gpt-image-1 accepts PNG/JPEG/WEBP up to a size limit; we normalise inputs to
 * reasonable dimensions and PNG so the edit call is fast and reliable.
 */

const MAX_INPUT_DIMENSION = 2048;

/**
 * Normalise an uploaded image buffer:
 *  - auto-rotate using EXIF orientation (mobile photos are often rotated)
 *  - downscale if larger than MAX_INPUT_DIMENSION on the longest edge
 *  - convert to PNG
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
export async function normaliseInput(buffer) {
  return sharp(buffer)
    .rotate() // honour EXIF orientation
    .resize({
      width: MAX_INPUT_DIMENSION,
      height: MAX_INPUT_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

/**
 * Read lightweight metadata for logging / response.
 * @param {Buffer} buffer
 */
export async function describe(buffer) {
  const { width, height, format } = await sharp(buffer).metadata();
  return { width, height, format, bytes: buffer.length };
}

/**
 * Convert a base64 string (from the OpenAI response) to a Buffer.
 * @param {string} b64
 */
export function fromBase64(b64) {
  return Buffer.from(b64, 'base64');
}

export default { normaliseInput, describe, fromBase64 };
