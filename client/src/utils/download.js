/** Trigger a browser download of a data URL / blob URL. */
export function downloadDataUrl(dataUrl, filename = 'autovision-result.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Create an object URL from a File for instant local preview. */
export function fileToObjectUrl(file) {
  return file ? URL.createObjectURL(file) : null;
}
