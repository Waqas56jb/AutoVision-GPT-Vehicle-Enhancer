import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { enhanceImage } from '../api/enhance.api.js';
import { compressImage } from '../utils/compressImage.js';

/**
 * Encapsulates the enhancement request lifecycle: loading, upload progress,
 * result, error. Keeps components declarative.
 */
export function useEnhance() {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState(null); // { image, meta }
  const [error, setError] = useState(null);

  const run = useCallback(async ({ vehicle, background, notes, framing, format }) => {
    if (!vehicle) {
      toast.error('Please add a vehicle photo first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setUploadPercent(0);

    const toastId = toast.loading('Enhancing your image…');
    try {
      // Compress in the browser first (keeps uploads under the serverless body
      // limit and speeds things up). The backend normalises again with sharp.
      const [vehicleC, backgroundC] = await Promise.all([
        compressImage(vehicle),
        background ? compressImage(background) : Promise.resolve(null),
      ]);

      const data = await enhanceImage({
        vehicle: vehicleC,
        background: backgroundC,
        notes,
        framing,
        format,
        onUploadProgress: setUploadPercent,
      });
      setResult(data);
      toast.success('Done! Dealership-ready image generated.', { id: toastId });
    } catch (err) {
      const message =
        err?.response?.data?.error?.message || err?.message || 'Something went wrong.';
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setUploadPercent(0);
  }, []);

  return { isLoading, uploadPercent, result, error, run, reset };
}

export default useEnhance;
