import type { IconName, SectionId } from '../../components/ds';

/**
 * What the course overview needs of a section and a lesson, so Our World's
 * (the build-time catalog) and every other course's (its loaded content) go
 * through the same components. Both of those types already fit.
 */
export interface OverviewSection {
  id: string;
  number: number;
  title: string;
  question: string;
  lessons: readonly number[];
}

export interface OverviewLesson {
  id: string;
  number: number;
  /** The id of the section it is in. */
  section: string;
  title: string;
  essentialQuestion: string;
  estimatedMinutes: readonly [number, number];
}

/** A section's tint (one of the four the brand book has) and its own icon. */
export interface SectionLook {
  tone: SectionId;
  icon: IconName;
}
