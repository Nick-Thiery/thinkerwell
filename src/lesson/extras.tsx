import { createContext, useContext, type ReactNode } from 'react';
import type { ActivityPlacement, CourseVisual, StageId } from '../content';

/**
 * Places in the lesson pages where a course can add something of its own.
 * Our World adds nothing, so its pages are exactly as they were. A preview
 * course (src/courses/kit/) puts its "draft" note at the top of every sheet;
 * Digital World its lesson's activity where the lesson file says
 * (`${stage}:${placement}`), and the same activity on paper in the print
 * view and teacher guide; Southeast Asia Through Time each lesson's second
 * picture, and a caption under both (`caption`).
 *
 *   read:after-evidence     Read, after the evidence and picture
 *   read:after-reading      Read, after the last part's reading (a second picture)
 *   write:before-prompt     Write, before the writing task
 *   sheet:top               the print view's and teacher guide's heading
 *   print:after-evidence    the print view, after the evidence
 *   print:after-reading     the print view, after the reading
 *   guide:after-evidence    the teacher guide, after the evidence
 *   guide:end               the teacher guide, at the end
 */
export type LessonSlotName =
  | `${StageId}:${ActivityPlacement}`
  | 'read:after-reading'
  | 'sheet:top'
  | 'print:after-evidence'
  | 'print:after-reading'
  | 'guide:after-evidence'
  | 'guide:end';

export interface LessonExtras {
  /** What goes in a place, or nothing. */
  readonly slot?: (name: LessonSlotName) => ReactNode;
  /** What goes under a lesson's picture (LessonVisual), or nothing. */
  readonly caption?: (visual: CourseVisual) => ReactNode;
}

const LessonExtrasContext = createContext<LessonExtras>({});

/** Gives the lesson pages below it a course's own additions. */
export const LessonExtrasProvider = LessonExtrasContext.Provider;

/** The course's additions (none for Our World). */
export function useLessonExtras(): LessonExtras {
  return useContext(LessonExtrasContext);
}

/** Whatever the course puts in this place (nothing for Our World). */
export function LessonSlot({ name }: { name: LessonSlotName }) {
  const { slot } = useContext(LessonExtrasContext);
  return <>{slot?.(name) ?? null}</>;
}
