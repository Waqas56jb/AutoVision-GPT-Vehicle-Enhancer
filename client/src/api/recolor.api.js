import apiClient from './client.js';

/**
 * Calls POST /api/recolor — changes ONLY the car's paint colour on a template
 * image, preserving the background, pose, framing and shadows.
 *
 * @param {object} params
 * @param {File} params.template       - the finished template image
 * @param {string} params.colorName    - e.g. "Gloss Black"
 * @param {string} [params.colorHex]   - e.g. "#0C0C0E"
 * @param {string} [params.format]     - carsales | landscape | square | portrait
 * @param {string} [params.notes]
 * @returns {Promise<{image:string, meta:object}>}
 */
export async function recolorImage({ template, colorName, colorHex, format, notes }) {
  const form = new FormData();
  form.append('vehicle', template);
  form.append('colorName', colorName);
  if (colorHex) form.append('colorHex', colorHex);
  if (format) form.append('format', format);
  if (notes) form.append('notes', notes);

  const { data } = await apiClient.post('/api/recolor', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!data?.success) {
    throw new Error(data?.error?.message || 'Recolour failed.');
  }
  return data.data;
}

export default recolorImage;
