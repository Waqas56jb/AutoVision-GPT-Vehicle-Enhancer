import apiClient from './client.js';

/**
 * Fetch the list of preset backgrounds available on the server.
 * @returns {Promise<{id:string,name:string,url:string}[]>}
 */
export async function fetchBackgrounds() {
  const { data } = await apiClient.get('/api/backgrounds');
  if (!data?.success) throw new Error('Failed to load backgrounds.');
  return data.data.backgrounds;
}

export default fetchBackgrounds;
