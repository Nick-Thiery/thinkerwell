import type { LessonStep } from '../content/stages';

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

/** A lesson's teacher guide: /educators/lesson/:id. */
export function teacherGuidePath(lessonId: string): string {
  return `/educators/lesson/${encodeURIComponent(lessonId)}`;
}

/** The answer key for a section check: /educators/section/:id/answers. */
export function answerKeyPath(sectionId: string): string {
  return `/educators/section/${encodeURIComponent(sectionId)}/answers`;
}

/** A section's certificate: /certificate/section/:id. */
export function sectionCertificatePath(sectionId: string): string {
  return `/certificate/section/${encodeURIComponent(sectionId)}`;
}

/** The certificate for the whole course: /certificate/course. */
export function courseCertificatePath(): string {
  return '/certificate/course';
}

/** The Educators page, with a section's lessons listed (its `?section=`). */
export function educatorsPath(sectionId?: string): string {
  return sectionId ? `/educators?section=${encodeURIComponent(sectionId)}` : '/educators';
}
