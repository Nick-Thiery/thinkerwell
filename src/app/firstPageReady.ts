import type { DataRouter } from 'react-router';

/**
 * Resolves once the router has the first page's code. Most pages load
 * theirs when first opened (./routes.tsx), so main.tsx waits for this
 * before rendering: until then, index.html's header bar stays on screen
 * rather than an empty page. Tests mount the app the same way.
 */
export function firstPageReady(router: DataRouter): Promise<void> {
  if (router.state.initialized) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = router.subscribe((state) => {
      if (!state.initialized) return;
      stop();
      resolve();
    });
  });
}
