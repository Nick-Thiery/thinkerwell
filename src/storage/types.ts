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
 */
import type { SectionId, StageId } from '../content';

export type { SectionId, StageId };

/** Avatar colours, matching the design system's tw-tone-* classes. */
export const LEARNER_COLOURS = ['lavender', 'lemon', 'history', 'geography', 'culture', 'civics'] as const;
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
}

/** What addLearner() needs; id and createdAt are filled in. */
export interface NewLearner {
  name: string;
  colour: LearnerColour;
  classCode?: string;
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

/** Per-device settings (shared by everyone who uses this device). */
export interface DeviceSettings {
  /** "Save data": videos off, Watch opens on "Read instead". */
  saveData: boolean;
  listeningSpeed: ListeningSpeed;
  preferredReadingLevel: ReadingLevel;
  /** Options a partner organisation turns on. All off by default. */
  partner: {
    /** Allow "Say it" to use a browser speech service that may send audio online. */
    allowOnlineDictation: boolean;
  };
}

export const DEFAULT_SETTINGS: DeviceSettings = {
  saveData: false,
  listeningSpeed: 'normal',
  preferredReadingLevel: 'standard',
  partner: { allowOnlineDictation: false },
};

/** Device-level values in the `device` store, by name. Add new ones here. */
export interface DeviceValues {
  /** The learner using the device now, or null for nobody / "Just look around". */
  currentLearnerId: string | null;
}
export type DeviceKey = keyof DeviceValues;
