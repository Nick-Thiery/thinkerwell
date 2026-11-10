/**
 * Loads the outline and the credits records of the courses other than Our
 * World (./outlineTypes.ts), each in a chunk of its own the first time a page
 * asks. Both are built into the app and precached, so they load offline; a
 * failed load is retried the next time.
 */
import { useEffect, useState } from 'react';
import type { CourseCredits, CourseOutlines } from './outlineTypes';

let outlinePromise: Promise<CourseOutlines> | undefined;
let creditsPromise: Promise<CourseCredits> | undefined;

export function loadCourseOutlines(): Promise<CourseOutlines> {
  outlinePromise ??= import('virtual:thinkerwell/course-outline').then((module) => module.default as CourseOutlines);
  outlinePromise.catch(() => {
    outlinePromise = undefined;
  });
  return outlinePromise;
}

export function loadCourseCredits(): Promise<CourseCredits> {
  creditsPromise ??= import('virtual:thinkerwell/course-credits').then((module) => module.default as CourseCredits);
  creditsPromise.catch(() => {
    creditsPromise = undefined;
  });
  return creditsPromise;
}

/** The outline of every other course once it has loaded, else null (and `failed` when it could not load). Loads only while `enabled`. */
export function useCourseOutlines(enabled = true): { outlines: CourseOutlines | null; failed: boolean } {
  const [state, setState] = useState<{ outlines: CourseOutlines | null; failed: boolean }>({ outlines: null, failed: false });
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    loadCourseOutlines().then(
      (outlines) => current && setState({ outlines, failed: false }),
      () => current && setState({ outlines: null, failed: true }),
    );
    return () => {
      current = false;
    };
  }, [enabled]);
  return state;
}

/** The credits records of every other course once they have loaded, else null. */
export function useCourseCredits(): { credits: CourseCredits | null; failed: boolean } {
  const [state, setState] = useState<{ credits: CourseCredits | null; failed: boolean }>({ credits: null, failed: false });
  useEffect(() => {
    let current = true;
    loadCourseCredits().then(
      (credits) => current && setState({ credits, failed: false }),
      () => current && setState({ credits: null, failed: true }),
    );
    return () => {
      current = false;
    };
  }, []);
  return state;
}
