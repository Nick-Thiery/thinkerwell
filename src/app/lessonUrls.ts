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
export type SettingsPart = 'listen-voice' | 'lesson-audio' | 'say-it' | 'move-work' | 'share-results';

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

/** The learning check's paper sheets and answer key, for the optional study, to print: /educators/learning-check (it was /educators/pilot-check). */
export function learningCheckPath(): string {
  return '/educators/learning-check';
}

/** The addresses those two had until October 2026; they still open the new ones. */
export const OLD_EDUCATOR_PATHS: ReadonlyArray<readonly [old: string, now: string]> = [
  ['/educators/pilot-day', '/educators/session-guide'],
  ['/educators/pilot-check', '/educators/learning-check'],
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

/** What a pilot involves, for organisations thinking of one: /organisations. */
export function organisationsPath(): string {
  return '/organisations';
}

/** The parents' and guardians' consent form to print: /educators/consent-form. */
export function consentFormPath(): string {
  return '/educators/consent-form';
}

/** The information sheet for families, given with the consent form, to print: /educators/information-sheet. */
export function informationSheetPath(): string {
  return '/educators/information-sheet';
}

/** Learners' code cards and the list of names to keep, to print: /educators/code-cards. */
export function codeCardsPath(): string {
  return '/educators/code-cards';
}
