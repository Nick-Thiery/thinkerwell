import { getLesson, getLessonByOldId, isLessonStep, type Lesson, type LessonStep } from '../content';

/** The URL of a lesson stage: /lesson/:id/:stage. */
export function lessonPath(lessonId: string, step: LessonStep = 'read'): string {
  return `/lesson/${encodeURIComponent(lessonId)}/${step}`;
}

/** The print view of a lesson: /lesson/:id/print. */
export function lessonPrintPath(lessonId: string): string {
  return `/lesson/${encodeURIComponent(lessonId)}/print`;
}

export function sectionCheckPath(sectionId: string): string {
  return `/section/${encodeURIComponent(sectionId)}/check`;
}

export type LessonRouteResult =
  | { kind: 'show'; lesson: Lesson; step: LessonStep }
  | { kind: 'redirect'; to: string }
  | { kind: 'not-found' };

/**
 * Works out what /lesson/:id or /lesson/:id/:stage should do.
 * - A new id with a known stage shows it.
 * - No stage redirects to Read.
 * - An old Base44 id (l6, history-scale, ...) redirects to the new id with the same stage (or Read).
 * - An unknown lesson or stage is not found.
 * Stage names are matched case-insensitively (old links were typed by hand).
 */
export function resolveLessonRoute(id: string | undefined, stage: string | undefined): LessonRouteResult {
  if (!id) return { kind: 'not-found' };
  const step = stage?.toLowerCase();
  if (step !== undefined && !isLessonStep(step)) return { kind: 'not-found' };

  const lesson = getLesson(id);
  if (lesson) {
    if (step === undefined || step !== stage) return { kind: 'redirect', to: lessonPath(lesson.id, step ?? 'read') };
    return { kind: 'show', lesson, step };
  }

  const moved = getLessonByOldId(id) ?? getLessonByOldId(id.toLowerCase()) ?? getLesson(id.toLowerCase());
  if (moved) return { kind: 'redirect', to: lessonPath(moved.id, step ?? 'read') };

  return { kind: 'not-found' };
}

/**
 * Works out what /lesson/:id/print should do: show a lesson's print view,
 * redirect an old Base44 id (or a different case) to the new one, or not
 * found.
 */
export function resolveLessonPrintRoute(
  id: string | undefined,
): { kind: 'show'; lesson: Lesson } | { kind: 'redirect'; to: string } | { kind: 'not-found' } {
  if (!id) return { kind: 'not-found' };
  const lesson = getLesson(id);
  if (lesson) return { kind: 'show', lesson };
  const moved = getLessonByOldId(id) ?? getLessonByOldId(id.toLowerCase()) ?? getLesson(id.toLowerCase());
  return moved ? { kind: 'redirect', to: lessonPrintPath(moved.id) } : { kind: 'not-found' };
}

