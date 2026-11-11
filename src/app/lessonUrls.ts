import type { LessonStep } from '../content/stages';

/** The URL of a lesson stage: /lesson/:id/:stage. */
export function lessonPath(lessonId: string, step: LessonStep = 'read'): string {
  return `/lesson/${encodeURIComponent(lessonId)}/${step}`;
}

/**
 * Whether an address is a lesson's own page (a step or the completion
 * screen), where the lesson says itself whether work is saved and the
 * header steps back (docs/notes/simpler-lessons.md). Not its print view.
 */
export function isLessonPlayerPath(pathname: string): boolean {
  return /^\/lesson\/[^/]+\/(read|write|speak|watch|reflect|complete)\/?$/i.test(pathname);
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

/** A part of Settings that other pages link straight to. */
export type SettingsPart = 'listen-voice' | 'course-files' | 'lesson-audio' | 'say-it' | 'move-work';

/** Settings for this device, or one part of it (/settings#say-it): the page scrolls to it once it has loaded. */
export function settingsPath(part?: SettingsPart): string {
  return part ? `/settings#${part}` : '/settings';
}

/** The educators' checklist for setting up a device: /educators/setup. */
export function setupPath(): string {
  return '/educators/setup';
}

/** The staff's one-page guide for a session, to print: /educators/session-guide (it was /educators/pilot-day). */
export function sessionGuidePath(): string {
  return '/educators/session-guide';
}

/** The session record and feedback sheet for educators, to print: /educators/feedback-sheet. */
export function feedbackSheetPath(): string {
  return '/educators/feedback-sheet';
}

/** The address the session guide had until October 2026; it still opens the new one. */
export const OLD_EDUCATOR_PATHS: ReadonlyArray<readonly [old: string, now: string]> = [['/educators/pilot-day', '/educators/session-guide']];

/**
 * The addresses of the optional learning study's information sheet, consent
 * form and learning check, which were retired on 11 November 2026 (Justin's
 * brief): the public site no longer serves them. They send a visitor to For
 * organisations, where each organisation's pilot is introduced
 * (vercel.json does the same for links from outside the app). Matched
 * without regard to case, like every route.
 */
export const RETIRED_STUDY_PATHS: readonly string[] = [
  '/educators/information-sheet',
  '/educators/consent-form',
  '/educators/learning-check',
  '/educators/pilot-check',
];

/** Every lesson's teacher guide and print view, and every section check's answer key: /educators/guides, a section open with `?section=`. */
export function guidesPath(sectionId?: string): string {
  return sectionId ? `/educators/guides?section=${encodeURIComponent(sectionId)}` : '/educators/guides';
}

/** The course page: /course. */
export function coursePath(): string {
  return '/course';
}

/** Every learner on this device and what each has done: /educators/class. */
export function classPath(): string {
  return '/educators/class';
}

/** Every certificate earned on this device, to print: /educators/class/certificates. */
export function allCertificatesPath(): string {
  return '/educators/class/certificates';
}

/** The Educators page: /educators. */
export function educatorsPath(): string {
  return '/educators';
}

/** Everyone whose work Thinkerwell is built on: /credits. */
export function creditsPath(): string {
  return '/credits';
}

/** The contact form, for anyone with a question: /contact. */
export function contactPath(): string {
  return '/contact';
}

/** Privacy & Child Safeguarding, linked from the footer on every page: /privacy-and-safeguarding. */
export function privacyPath(): string {
  return '/privacy-and-safeguarding';
}

/** For organisations thinking of a pilot: /organisations. */
export function organisationsPath(): string {
  return '/organisations';
}

/** Learners' code cards and the list of names to keep, to print: /educators/code-cards. */
export function codeCardsPath(): string {
  return '/educators/code-cards';
}
