/**
 * What the app knows about the three courses other than Our World without
 * loading them: a small outline (sections, lessons, titles in each language)
 * and the records Credits lists (sources, videos, picture credits). Both are
 * made at build time from the course's own files by tools/outline/build.ts
 * and loaded only by the pages that need them (./outline.ts), so a first
 * visit never downloads them and no course's lessons are copied by hand.
 */

/** A name by language code: always `en`, and `id` and `ms` where the course is translated. */
export type Titles = Readonly<Record<string, string>>;

export interface OutlineSection {
  id: string;
  number: number;
  titles: Titles;
  /** Its tint and icon (src/courses/kit/courseLooks.ts). */
  look: { tone: 'history' | 'geography' | 'culture' | 'civics'; icon: string };
  /** Lesson numbers, in order. */
  lessons: readonly number[];
  /** How many questions the section's check has, or null when the section has none. */
  checkQuestions: number | null;
}

export interface OutlineLesson {
  id: string;
  number: number;
  section: string;
  titles: Titles;
  estimatedMinutes: readonly [number, number];
  /** True when the lesson has a Watch step in English (a video); in a translated language it has none. */
  video: boolean;
}

export interface CourseOutline {
  sections: readonly OutlineSection[];
  lessons: readonly OutlineLesson[];
}

/** Every course other than Our World, by course id. */
export type CourseOutlines = Readonly<Record<string, CourseOutline>>;

/** Where a real picture came from (src/content/schema.ts, pictureCreditSchema). */
export interface CreditedPicture {
  title: string;
  creator: string;
  created: string;
  institution: string | null;
  sourceUrl: string;
  licence: string;
  licenceUrl: string | null;
  changes: string;
}

export interface CreditPictureRecord {
  /** Which of the lesson's two pictures: the one with the evidence, or the one after the reading. */
  slot: 'visual' | 'secondVisual';
  /** Its credit, or null for a picture made for Thinkerwell. */
  credit: CreditedPicture | null;
}

export interface CreditVideo {
  youtubeId: string;
  title: string;
  channel: string;
}

export interface CreditSource {
  label: string;
  url: string;
}

export interface CreditLesson {
  id: string;
  number: number;
  section: string;
  titles: Titles;
  /** The lesson's sources by language code: always `en`, and a language's own labels where the lesson is translated. */
  sources: Readonly<Record<string, readonly CreditSource[]>>;
  video: CreditVideo | null;
  /** Only pictures that exist: a lesson whose picture isn't made yet has none. */
  pictures: readonly CreditPictureRecord[];
}

/** Every course other than Our World, by course id: its lessons' credits in course order. */
export type CourseCredits = Readonly<Record<string, readonly CreditLesson[]>>;
