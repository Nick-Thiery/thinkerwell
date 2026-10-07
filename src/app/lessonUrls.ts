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

/** A part of Settings that other pages link straight to. */
export type SettingsPart = 'listen-voice' | 'lesson-audio' | 'say-it' | 'move-work';

/** Settings for this device, or one part of it (/settings#say-it): the page scrolls to it once it has loaded. */
export function settingsPath(part?: SettingsPart): string {
  return part ? `/settings#${part}` : '/settings';
}

/** The educators' checklist for setting up a device: /educators/setup. */
export function setupPath(): string {
  return '/educators/setup';
}

/** Every learner on this device and what each has done: /educators/class. */
export function classPath(): string {
  return '/educators/class';
}

/** Every certificate earned on this device, to print: /educators/class/certificates. */
export function allCertificatesPath(): string {
  return '/educators/class/certificates';
}

/** The Educators page, with a section's lessons listed (its `?section=`). */
export function educatorsPath(sectionId?: string): string {
  return sectionId ? `/educators?section=${encodeURIComponent(sectionId)}` : '/educators';
}

/** Everyone whose work Thinkerwell is built on: /credits. */
export function creditsPath(): string {
  return '/credits';
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
