/**
 * What the class view (/educators/class) and "Print all certificates"
 * (/educators/class/certificates) show, worked out from the work saved on
 * this device (store.exportWork(): every learner with their lesson progress
 * and section checks). Pure functions, so the numbers are easy to test.
 *
 * Nothing here is a score, and nothing ranks learners: the class view is
 * open to anyone on a shared device, and the course has no leaderboards
 * (CLAUDE.md). Learners are listed by name.
 */
import type { Lesson, Section, SectionId, StageId } from '../../content';
import {
  findContinueTarget,
  isLessonComplete,
  lessonSetStatus,
  progressByLessonId,
  sectionProgress,
  type Learner,
  type LearnerWork,
} from '../../storage';
import type { CertificateScope } from '../certificate/Certificate';

/** Where a learner is in the course now. */
export type OnNow =
  /** Nothing saved yet. */
  | { kind: 'not-started' }
  /** The unfinished lesson they worked on most recently, and the step they were on. */
  | { kind: 'in-progress'; lesson: Lesson; stage: StageId }
  /** Nothing unfinished is open: the next lesson after the one they finished last (as "Continue" on their home). */
  | { kind: 'up-next'; lesson: Lesson }
  /** Every lesson is finished. */
  | { kind: 'finished' };

export interface SectionCount {
  section: Section;
  completed: number;
  total: number;
}

export interface LearnerSummary {
  learner: Learner;
  /** Lessons finished in each section, in course order. */
  sections: SectionCount[];
  onNow: OnNow;
  /** The latest time any of their work was saved (a lesson or a section check), or null. */
  lastActive: string | null;
  /** The sections whose check they have tried at least once, in course order. Never a score. */
  checksTried: Section[];
}

export function summariseLearner(work: LearnerWork, lessons: readonly Lesson[], sections: readonly Section[]): LearnerSummary {
  const progress = progressByLessonId(work.progress);

  let onNow: OnNow;
  if (work.progress.length === 0) {
    onNow = { kind: 'not-started' };
  } else {
    const target = findContinueTarget(lessons, progress);
    if (!target) onNow = { kind: 'finished' };
    else {
      const record = progress.get(target.lesson.id);
      onNow =
        record && !isLessonComplete(record)
          ? { kind: 'in-progress', lesson: target.lesson, stage: target.stage }
          : { kind: 'up-next', lesson: target.lesson };
    }
  }

  let lastActive: string | null = null;
  const later = (at: string | undefined | null) => {
    if (at && (!lastActive || at > lastActive)) lastActive = at;
  };
  for (const record of work.progress) later(record.updatedAt);
  for (const record of work.quizAttempts) {
    later(record.latest.finishedAt);
    later(record.best.finishedAt);
  }

  const tried = new Set<SectionId>(work.quizAttempts.filter((record) => record.attempts > 0).map((record) => record.sectionId));

  return {
    learner: work.learner,
    sections: sections.map((section) => ({ section, ...sectionProgress(section, lessons, progress) })),
    onNow,
    lastActive,
    checksTried: sections.filter((section) => tried.has(section.id)),
  };
}

/**
 * Learners in order of name, for the page's language (ignoring case and
 * accents), never by progress. Learners who share a name keep the order
 * they were added in.
 */
export function byName<T extends { learner: Learner }>(items: readonly T[], lang: string): T[] {
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  return [...items].sort(
    (a, b) =>
      collator.compare(a.learner.name, b.learner.name) ||
      (a.learner.createdAt < b.learner.createdAt ? -1 : a.learner.createdAt > b.learner.createdAt ? 1 : 0) ||
      (a.learner.id < b.learner.id ? -1 : a.learner.id > b.learner.id ? 1 : 0),
  );
}

export interface EarnedCertificate {
  learner: Learner;
  scope: CertificateScope;
  /** When the last of its lessons was finished: the date on the certificate. */
  finishedAt: string;
}

/**
 * Every certificate earned on this device: for each learner (in order of
 * name), each section they have finished (in course order), then the course
 * if they have finished it. The same rule as a learner's own certificate
 * page (lessonSetStatus): every lesson finished; section checks are never
 * needed.
 */
export function earnedCertificates(
  work: readonly LearnerWork[],
  lessons: readonly Lesson[],
  sections: readonly Section[],
  lang: string,
): EarnedCertificate[] {
  const out: EarnedCertificate[] = [];
  for (const { learner, progress: records } of byName(work, lang)) {
    const progress = progressByLessonId(records);
    for (const section of sections) {
      const status = lessonSetStatus(
        lessons.filter((lesson) => section.lessons.includes(lesson.number)),
        progress,
      );
      if (status.complete && status.finishedAt) out.push({ learner, scope: { kind: 'section', section }, finishedAt: status.finishedAt });
    }
    const course = lessonSetStatus(lessons, progress);
    if (course.complete && course.finishedAt) out.push({ learner, scope: { kind: 'course' }, finishedAt: course.finishedAt });
  }
  return out;
}
