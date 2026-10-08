import { useEffect, useState, type ComponentType } from 'react';
import { PageNotDownloaded } from '../pages/PageNotDownloaded';
import { isPageDownloadError } from './pageDownload';

type Door = typeof import('../courses/routes'); // eslint-disable-line @typescript-eslint/consistent-type-imports -- the door's module type, without importing it

/**
 * The way into the preview courses (src/courses/routes.tsx): a chunk of its
 * own in assets/preview/, like the courses themselves, so no device stores
 * it offline and no first visit downloads it (src/courses/build.ts). Our
 * World's lesson pages hand a preview course's lesson ("dw-...") to it.
 */
export const loadPreviewDoor = (): Promise<Door> => import('../courses/routes');

let door: Door | undefined;

/**
 * A page from src/courses/routes.tsx, loaded when it is first shown. If it
 * can't be downloaded (offline before it ever was), "This page hasn't
 * downloaded yet", as for any other page.
 */
export function previewDoor<P extends object>(pick: (routes: Door) => ComponentType<P>): ComponentType<P> {
  return function PreviewDoor(props: P) {
    const [state, setState] = useState<{ routes?: Door; failure?: { error: unknown } }>(() => ({ routes: door }));
    useEffect(() => {
      if (state.routes || state.failure) return undefined;
      let live = true;
      loadPreviewDoor().then(
        (routes) => {
          door = routes;
          if (live) setState({ routes });
        },
        (error: unknown) => {
          if (live) setState({ failure: { error } });
        },
      );
      return () => {
        live = false;
      };
    }, [state]);
    if (state.routes) {
      const Page = pick(state.routes);
      return <Page {...props} />;
    }
    if (state.failure) {
      if (!isPageDownloadError(state.failure.error)) throw state.failure.error;
      return (
        <PageNotDownloaded
          retry={async () => {
            const routes = await loadPreviewDoor();
            door = routes;
            setState({ routes });
          }}
        />
      );
    }
    return null;
  };
}
