import { useState, type ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { PageNotDownloaded } from '../pages/PageNotDownloaded';
import { isPageDownloadError } from './pageDownload';

/**
 * A route whose page loads when it is first opened (react-router's `lazy`),
 * so a first visit to the home page or the course map doesn't wait for the
 * code, lessons and styles of pages it isn't showing
 * (docs/notes/slow-internet.md). Every one of these files is still in the
 * service worker's precache, so they all open offline after the first visit.
 * While one loads, the page you are on stays; on a first visit straight to
 * one, index.html's header bar stays until it is ready (main.tsx).
 *
 * If the page's code can't be downloaded (the connection dropped before the
 * course was stored), the page says so calmly, under the header, with "Try
 * again" (src/pages/PageNotDownloaded.tsx), rather than "Something went
 * wrong". react-router keeps a failed `lazy` for good, so the route gets a
 * page that tries the download itself and shows the real page once it has
 * it. Any other error is thrown as before, to the route's error page.
 */
export function lazyPage<M>(load: () => Promise<M>, pick: (module: M) => ComponentType): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => {
      try {
        return { Component: pick(await load()) };
      } catch (error) {
        if (!isPageDownloadError(error)) throw error;
        return { Component: notDownloadedYet(load, pick) };
      }
    },
  };
}

/** The page for a route whose code hasn't downloaded: the message until "Try again" gets it, then the page itself. */
function notDownloadedYet<M>(load: () => Promise<M>, pick: (module: M) => ComponentType): ComponentType {
  let Downloaded: ComponentType | null = null;
  return function PageOnceDownloaded() {
    const [, setDownloaded] = useState(false);
    if (Downloaded) return <Downloaded />;
    const retry = async () => {
      Downloaded = pick(await load());
      setDownloaded(true);
    };
    return <PageNotDownloaded retry={retry} />;
  };
}
