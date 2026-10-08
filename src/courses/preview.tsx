/**
 * Preview courses (src/content/courses.ts): hidden everywhere unless this
 * device has turned one on at its hidden address (/preview/<id>), then
 * loaded on demand. This file is the only one that imports a course's code
 * (src/courses/<id>/), always with import(), so the course's lessons,
 * activities, styles and words stay in a chunk of their own that the
 * service worker never stores and a first visit never downloads
 * (src/courses/build.ts, docs/notes/digital-world-preview.md).
 *
 * With the preview off, every one of the course's addresses is "This page
 * isn't here", exactly as for an address that doesn't exist, and nothing is
 * downloaded for it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { isPageDownloadError } from '../app/pageDownload';
import { findPreviewCourse } from '../content/courses';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PageNotDownloaded } from '../pages/PageNotDownloaded';
import { useLearnerSession } from '../session';
import type { PreviewCourseModule } from './types';

const LOADERS: Readonly<Record<string, () => Promise<PreviewCourseModule>>> = {
  'digital-world': () => import('./digital-world/index').then((module) => module.course),
};

const loaded = new Map<string, PreviewCourseModule>();
const loading = new Map<string, Promise<PreviewCourseModule>>();

/** Loads a preview course's code (once), and waits for its stylesheet. Rejects if it can't be downloaded; a later call tries again. */
export function loadPreviewCourse(id: string): Promise<PreviewCourseModule> {
  const load = LOADERS[id];
  if (!load) return Promise.reject(new Error(`No preview course "${id}".`));
  let pending = loading.get(id);
  if (!pending) {
    pending = load().then(async (module) => {
      await module.ready;
      loaded.set(id, module);
      return module;
    });
    pending.catch(() => loading.delete(id));
    loading.set(id, pending);
  }
  return pending;
}

/** True when this device has turned the course on. */
export function usePreviewOn(courseId: string): boolean {
  return useLearnerSession().previewCourses.includes(courseId);
}

export interface PreviewCourseProps {
  /** The course's id, from the address (any case). */
  courseId: string | undefined;
  /** 'load': show the page even with the preview off (only /preview/<id>, which turns it on). */
  whenOff?: 'not-found' | 'load';
  /** Part of another page (the course choice): nothing at all instead of "isn't here" or "hasn't downloaded". */
  quiet?: boolean;
  children: (course: PreviewCourseModule) => ReactNode;
}

/**
 * A preview course's page: "This page isn't here" for an unknown course or
 * one this device hasn't turned on; otherwise its code, once downloaded
 * ("This page hasn't downloaded yet" if it can't be).
 */
export function PreviewCourse({ courseId, whenOff = 'not-found', quiet = false, children }: PreviewCourseProps) {
  const session = useLearnerSession();
  const course = findPreviewCourse(courseId);
  if (session.status === 'loading') return null;
  if (!course || !LOADERS[course.id] || (whenOff === 'not-found' && !session.previewCourses.includes(course.id))) {
    return quiet ? null : <NotFoundPage />;
  }
  return (
    <LoadedCourse id={course.id} quiet={quiet}>
      {children}
    </LoadedCourse>
  );
}

function LoadedCourse({ id, quiet, children }: { id: string; quiet: boolean; children: (course: PreviewCourseModule) => ReactNode }) {
  const [state, setState] = useState<{ id: string; module?: PreviewCourseModule; failure?: { error: unknown } }>(() => ({ id, module: loaded.get(id) }));
  const current = state.id === id ? state : { id, module: loaded.get(id) };

  useEffect(() => {
    if (current.module || current.failure) return undefined;
    let live = true;
    loadPreviewCourse(id).then(
      (module) => {
        if (live) setState({ id, module });
      },
      (error: unknown) => {
        if (live) setState({ id, failure: { error } });
      },
    );
    return () => {
      live = false;
    };
  }, [id, current.module, current.failure]);

  if (current.module) return <>{children(current.module)}</>;
  if (current.failure) {
    if (quiet) return null;
    // Anything but a failed download goes to the route's error page.
    if (!isPageDownloadError(current.failure.error)) throw current.failure.error;
    return (
      <PageNotDownloaded
        retry={async () => {
          const module = await loadPreviewCourse(id);
          setState({ id, module });
        }}
      />
    );
  }
  return null;
}
