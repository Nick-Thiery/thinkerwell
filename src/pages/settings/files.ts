/**
 * Giving the person a file and reading one they pick, in the browser only:
 * nothing is sent anywhere, and no permission is asked for.
 */

/**
 * How long a download's object URL is kept. Safari (iPad and iPhone) and
 * some Android browsers read the file after click() returns, so revoking it
 * at once can leave an empty or failed download; FileSaver.js waits 40 s.
 */
export const REVOKE_AFTER_MS = 40_000;

/**
 * Downloads `text` as a file called `name`, through a Blob and a temporary
 * <a download>. Works in iPad Safari (13 and later, which asks where to save
 * it) and Android Chrome (which saves it to Downloads), and needs no
 * showSaveFilePicker. A blob: URL on this site's own page needs no change to
 * the Content-Security-Policy.
 */
export function downloadFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  }
}

/** A picked file's text (Blob.text() where the browser has it, FileReader otherwise). */
export function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsText(file);
  });
}
