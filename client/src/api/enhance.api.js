import apiClient from './client.js';

/**
 * Calls POST /api/enhance with the vehicle (required), background (optional)
 * and notes (optional). Returns { image, meta }.
 *
 * @param {object} params
 * @param {File} params.vehicle
 * @param {File|null} params.background
 * @param {string} [params.notes]
 * @param {(percent:number)=>void} [params.onUploadProgress]
 */
export async function enhanceImage({ vehicle, background, notes, onUploadProgress }) {
  const form = new FormData();
  form.append('vehicle', vehicle);
  if (background) form.append('background', background);
  if (notes) form.append('notes', notes);

  const { data } = await apiClient.post('/api/enhance', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onUploadProgress && evt.total) {
        onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  if (!data?.success) {
    throw new Error(data?.error?.message || 'Enhancement failed.');
  }
  return data.data;
}

export default enhanceImage;
