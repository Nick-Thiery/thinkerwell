import { createContext, useContext, type ReactNode } from 'react';
import type { ActivityPlacement, StageId } from '../content';

/**
 * Places in the lesson pages where a course can add something of its own.
 * Our World adds nothing, so its pages are exactly as they were. A preview
 * course (src/courses/digital-world/) puts its lesson's activity where the
 * lesson file says (`${stage}:${placement}`), the same activity on paper in
 * the print view and teacher guide, and its "draft" note at the top of
 * every sheet.
 *
 *   read:after-evidence     Read, after the evidence and picture
 *   write:before-prompt     Write, before the writing task
 *   sheet:top               the print view's and teacher guide's heading
 *   print:after-evidence    the print view, after the evidence
 *   guide:after-evidence    the teacher guide, after the evidence
 *   guide:end               the teacher guide, at the end
 */
export type LessonSlotName = `${StageId}:${ActivityPlacement}` | 'sheet:top' | 'print:after-evidence' | 'guide:after-evidence' | 'guide:end';

export interface LessonExtras {
  /** What goes in a place, or nothing. */
  readonly slot?: (name: LessonSlotName) => ReactNode;
}

const LessonExtrasContext = createContext<LessonExtras>({});

/** Gives the lesson pages below it a course's own additions. */
export const LessonExtrasProvider = LessonExtrasContext.Provider;

/** Whatever the course puts in this place (nothing for Our World). */
export function LessonSlot({ name }: { name: LessonSlotName }) {
  const { slot } = useContext(LessonExtrasContext);
  return <>{slot?.(name) ?? null}</>;
}
