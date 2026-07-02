import apiClient from './client.js';

/**
 * Fetch the list of saved backgrounds available on the server.
 * @returns {Promise<{id:string,name:string,url:string}[]>}
 */
export async function fetchBackgrounds() {
  const { data } = await apiClient.get('/api/backgrounds');
  if (!data?.success) throw new Error('Failed to load backgrounds.');
  return data.data.backgrounds;
}

/**
 * Upload & save a new background into the library.
 * @param {File} file
 * @returns {Promise<{id:string,name:string,url:string}>}
 */
export async function uploadBackground(file) {
  const form = new FormData();
  form.append('background', file);
  const { data } = await apiClient.post('/api/backgrounds', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data?.success) throw new Error(data?.error?.message || 'Failed to upload background.');
  return data.data.background;
}

/**
 * Delete a saved background by id.
 * @param {string} id
 */
export async function deleteBackground(id) {
  const { data } = await apiClient.delete(`/api/backgrounds/${encodeURIComponent(id)}`);
  if (!data?.success) throw new Error(data?.error?.message || 'Failed to delete background.');
  return true;
}

export default fetchBackgrounds;
