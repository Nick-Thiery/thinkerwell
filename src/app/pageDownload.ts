/**
 * When a page's code (a lazily loaded chunk, src/app/routes.tsx) couldn't
 * be downloaded: the connection dropped after the first page showed but
 * before the service worker had stored the course, on a first visit
 * (docs/notes/slow-internet.md). ./lazyPage.tsx then shows "This page
 * hasn't downloaded yet" (src/pages/PageNotDownloaded.tsx) instead of
 * "Something went wrong".
 */

/**
 * What browsers say when import() couldn't fetch a module (no connection,
 * or the file isn't on the server), as opposed to an error in the module's
 * own code, which says something else and still shows "Something went wrong".
 */
const DOWNLOAD_FAILED = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite's preload helper
];

/** True when an error from loading a page's code means it couldn't be downloaded. */
export function isPageDownloadError(error: unknown): boolean {
  return error instanceof Error && DOWNLOAD_FAILED.some((pattern) => pattern.test(error.message));
}

/**
 * Whether the site answers now, so the connection is back. Asks for the
 * home page's headers only (a HEAD request to this site, never stored).
 */
export async function siteAnswers(): Promise<boolean> {
  try {
    const response = await fetch('/', { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
    return response.ok;
  } catch {
    return false;
  }
}

/** Loads the page again from the start. */
export function reloadPage(): void {
  window.location.reload();
}
