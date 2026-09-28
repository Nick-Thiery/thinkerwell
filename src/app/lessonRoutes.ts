import { getLesson, getLessonByOldId, isLessonStep, type Lesson, type LessonStep } from '../content';
import { lessonPath, lessonPrintPath, teacherGuidePath } from './lessonUrls';

// What the lesson pages' addresses resolve to. These need the lessons
// themselves, so only the lazily loaded lesson, print and teacher guide
// routes use them; the links (./lessonUrls.ts) need no lesson at all.

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
export function resolveLessonPrintRoute(id: string | undefined): LessonPageRouteResult {
  return resolveLessonPage(id, lessonPrintPath);
}

/**
 * Works out what /educators/lesson/:id (a teacher guide) should do, like
 * the print view: show it, redirect an old Base44 id (or a different case)
 * to the new one, or not found.
 */
export function resolveTeacherGuideRoute(id: string | undefined): LessonPageRouteResult {
  return resolveLessonPage(id, teacherGuidePath);
}

export type LessonPageRouteResult = { kind: 'show'; lesson: Lesson } | { kind: 'redirect'; to: string } | { kind: 'not-found' };

/** A page about one whole lesson (its print view or teacher guide), found by its id or its old Base44 id. */
function resolveLessonPage(id: string | undefined, pathFor: (lessonId: string) => string): LessonPageRouteResult {
  if (!id) return { kind: 'not-found' };
  const lesson = getLesson(id);
  if (lesson) return { kind: 'show', lesson };
  const moved = getLessonByOldId(id) ?? getLessonByOldId(id.toLowerCase()) ?? getLesson(id.toLowerCase());
  return moved ? { kind: 'redirect', to: pathFor(moved.id) } : { kind: 'not-found' };
}

