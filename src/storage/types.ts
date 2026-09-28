/**
 * What Thinkerwell keeps on the device, in IndexedDB. Nothing here leaves the
 * device in phase 1. Dates are ISO 8601 strings (new Date().toISOString()).
 *
 * Stores (see ./db.ts for keys, indexes and migrations):
 *   learners      key id                       one per learner on this device
 *   progress      key [learnerId, lessonId]    one per learner and lesson
 *   quizAttempts  key [learnerId, sectionId]   best and latest section check per learner and section
 *   recordings    key [learnerId, lessonId]    the latest Speak clip only
 *   settings      key 'device'                 one record of device settings
 *   device        key name                     device-level values (current learner, ...)
 *
 * The journal is built from progress (writing and reflections); it is not stored separately.
 *
 * When you change these shapes, bump DB_VERSION in ./db.ts and add a migration.
 * Learner, LessonProgress and SectionQuizRecord also travel in work files
 * (Settings, "Move work to another device"): update the checker in
 * ./workFile.ts, the merge rules in ./mergeWork.ts, and WORK_FILE_VERSION if
 * the file's shape changes.
 */
import type { SectionId, StageId } from '../content';

export type { SectionId, StageId };

/**
 * Avatar colours a learner can pick on the NewLearner panel, matching the
 * design system's tw-tone-* classes: Yellow (lemon), Sand (history), Green
 * (geography), Blue (civics), White (paper), exactly as
 * docs/screens/NewLearner.dc.html offers them.
 *
 * The brand book (docs/design-system/README.md) actually lists "learner
 * avatars" as a `lavender` use, and keeps the four section tints
 * (`sec-history`, `sec-geography`, `sec-culture`, `sec-civics`) for section
 * places only, "always beside the section's icon and name" — lavender, not
 * a section tint, is its answer for avatars. NewLearner.dc.html instead
 * reuses lemon, three of the four section tints and paper, and leaves
 * lavender and the "culture" tint out. This file follows the screen, as a
 * deliberate, narrow, RECORDED exception (CLAUDE.md and docs/PRODUCT.md's
 * phase 3 decisions): a learner's own avatar colour is not "in a section
 * place" the way a lesson card or section header is, so seeing it away from
 * that section's icon and name reads as a colour choice, not a mislabelled
 * section. This is still open for Justin and Nick to confirm or revert to
 * the brand book's lavender-avatars rule.
 */
export const LEARNER_COLOURS = ['lemon', 'history', 'geography', 'civics', 'paper'] as const;
export type LearnerColour = (typeof LEARNER_COLOURS)[number];

export interface Learner {
  /** Random id (crypto.randomUUID()). */
  id: string;
  /** The name or nickname the learner typed. Never required to be a real name. */
  name: string;
  colour: LearnerColour;
  createdAt: string;
  /** Optional class code linking the learner to a partner group, e.g. "HLP-07". */
  classCode?: string;
  /**
   * The reading level this learner last chose in a lesson (Standard or
   * Simpler). Missing until they choose: the device's
   * settings.preferredReadingLevel applies until then. Optional, so learners
   * saved before phase 4 need no migration.
   */
  readingLevel?: ReadingLevel;
  /**
   * The language this learner sees the interface in (a code from
   * src/i18n/locales.ts). Missing until they choose one: the device's
   * settings.language applies until then. A code that isn't offered (not
   * ready in this version) is ignored, never an error. Optional, so
   * learners saved before it existed need no migration.
   */
  language?: string;
}

/** What addLearner() needs; id and createdAt are filled in. */
export interface NewLearner {
  name: string;
  colour: LearnerColour;
  classCode?: string;
  /** Only when a language other than the device's was chosen. */
  language?: string;
}

/** A saved answer to one quick-check question, keyed by the question's index in lesson.read.checks. */
export type CheckAnswer =
  | {
      type: 'choice';
      /** Index of the chosen option in the content file's order (not the shuffled order). */
      selected: number;
      correct: boolean;
      /** How many times the learner has answered (checks can be retried freely). */
      tries: number;
    }
  | { type: 'think'; text: string };

export interface WritingProgress {
  /** The learner's answer to write.prompt. */
  text: string;
  /** Planning notes, keyed by index in write.planningBoxes. */
  planning: Record<number, string>;
  /** Self-check ticks, keyed by index in write.selfCheck. */
  selfCheck: Record<number, boolean>;
  /** True once the example answer has been shown. */
  exampleShown: boolean;
}

export interface SpeakProgress {
  /** Index into course.json practiceOptions ("I practised with a partner", ...), or null. */
  practisedHow: number | null;
}

export interface WatchProgress {
  beforeAnswer: string;
  afterAnswer: string;
  /** True if the learner used the written version ("Read instead"). */
  readInstead: boolean;
}

/** One learner's work on one lesson. */
export interface LessonProgress {
  learnerId: string;
  lessonId: string;
  /** Stages the learner has finished, in the order they finished them. */
  stagesDone: StageId[];
  /** Where the learner is now (for "Continue"). */
  currentStage: StageId;
  warmUpAnswer: string | null;
  /** Quick-check answers keyed by index in lesson.read.checks. */
  checkAnswers: Record<number, CheckAnswer>;
  writing: WritingProgress;
  speak: SpeakProgress;
  watch: WatchProgress;
  /** Reflections keyed by index in lesson.reflect.prompts. */
  reflections: Record<number, string>;
  startedAt: string;
  updatedAt: string;
  /** Set when the required reflect prompt is answered. */
  completedAt: string | null;
}

/** One go at a section check. */
export interface QuizAttempt {
  /** Chosen option index per question, keyed by question id (question ids come with content/quizzes in phase 7). */
  answers: Record<string, number>;
  score: number;
  total: number;
  finishedAt: string;
}

/** Section-check results for one learner and section: the best and the latest attempt. */
export interface SectionQuizRecord {
  learnerId: string;
  sectionId: SectionId;
  best: QuizAttempt;
  latest: QuizAttempt;
  attempts: number;
}

/** The latest Speak recording for one learner and lesson. Never uploaded. */
export interface Recording {
  learnerId: string;
  lessonId: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: string;
}

export type ReadingLevel = 'standard' | 'simpler';
export type ListeningSpeed = 'slow' | 'normal';

/**
 * What the browser said when asked whether it can turn English speech into
 * text on the device (SpeechRecognition.available({ processLocally: true })):
 * 'available' now, 'downloadable' or 'downloading' after a language pack
 * download, 'unavailable', or 'unsupported' where the browser has no
 * on-device option at all.
 */
export type OnDeviceSpeechStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';

/** The result of "Check this device" on the Settings page. */
export interface SpeechCheck {
  status: OnDeviceSpeechStatus;
  /** When the check ran. */
  checkedAt: string;
}

/** Per-device settings (shared by everyone who uses this device). */
export interface DeviceSettings {
  /**
   * "Save data" (Settings): videos off, so Watch opens on the written
   * version. true or false once someone chooses; null until then, when the
   * browser's own data-saver hint decides (src/offline/saveData.ts).
   */
  saveData: boolean | null;
  listeningSpeed: ListeningSpeed;
  preferredReadingLevel: ReadingLevel;
  /** Options a partner organisation turns on. All off by default. */
  partner: {
    /** Allow "Say it" to use a browser speech service that may send audio online. */
    allowOnlineDictation: boolean;
  };
  /**
   * The last "Check this device" an educator ran in Settings, or null until
   * someone runs it. Lessons offer on-device Say it only when this says
   * 'available': they never ask the browser themselves, because asking
   * crashed the tab in some browsers (docs/notes/phase-5.md). Records saved
   * before this setting existed get null from getSettings(), so it needs no
   * migration.
   */
  speechCheck: SpeechCheck | null;
  /**
   * The interface language for the home screen, anyone looking around and
   * any learner who hasn't chosen one (a code from src/i18n/locales.ts), or
   * null for English. Records saved before this setting existed get null
   * from getSettings(), so it needs no migration.
   */
  language: string | null;
}

export const DEFAULT_SETTINGS: DeviceSettings = {
  saveData: null,
  listeningSpeed: 'normal',
  preferredReadingLevel: 'standard',
  partner: { allowOnlineDictation: false },
  speechCheck: null,
  language: null,
};

/** Device-level values in the `device` store, by name. Add new ones here. */
export interface DeviceValues {
  /** The learner using the device now, or null for nobody / "Just look around". */
  currentLearnerId: string | null;
}
export type DeviceKey = keyof DeviceValues;
