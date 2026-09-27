/**
 * Zod schemas for content/course.json and content/lessons/*.json, matching the
 * files exactly as they are (docs/content/SPEC.md section 3). Objects are
 * strict: an unknown field is an error, so a content change that adds a field
 * must update this file too. The content test (content.test.ts) parses every
 * file with these schemas.
 */
import { z } from 'zod';
import { QUIZ_SKILLS } from './quizSkills';

export const SECTION_IDS = ['history', 'geography', 'culture', 'civics'] as const;
export const sectionIdSchema = z.enum(SECTION_IDS);
export type SectionId = z.infer<typeof sectionIdSchema>;

const text = z.string().trim().min(1);
/** A stable URL slug: lowercase letters, digits and single hyphens. */
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug');

// ---------------------------------------------------------------- course.json

export const sectionSchema = z.strictObject({
  id: sectionIdSchema,
  number: z.number().int().positive(),
  title: text,
  question: text,
  description: text,
  /** Lesson numbers in this section, in order. */
  lessons: z.array(z.number().int().positive()).min(1),
});
export type Section = z.infer<typeof sectionSchema>;

export const courseFileSchema = z.strictObject({
  schemaVersion: z.literal(2),
  course: z.strictObject({
    title: text,
    description: text,
    totalLessons: z.number().int().positive(),
    estimatedHours: z.number().positive(),
  }),
  sections: z.array(sectionSchema).length(4),
  /** "How I practised" options for the Speak stage, shared by every lesson. */
  practiceOptions: z.array(text).min(2),
  /** The label shown on fictional evidence. */
  fictionLabel: text,
});
export type CourseFile = z.infer<typeof courseFileSchema>;

// -------------------------------------------------------------- evidence cards

export const MAP_LEGEND_COLORS = ['blue', 'green', 'brown', 'grey', 'yellow'] as const;

const itemsCardSchema = z.strictObject({
  type: z.literal('items'),
  title: text,
  items: z.array(text).min(1),
});

const timelineCardSchema = z.strictObject({
  type: z.literal('timeline'),
  title: text,
  events: z.array(z.strictObject({ year: text, text })).min(1),
});

const mapCardSchema = z.strictObject({
  type: z.literal('map'),
  title: text,
  locations: z.array(z.strictObject({ id: text, label: text, description: text })).min(1),
  legend: z.array(z.strictObject({ label: text, color: z.enum(MAP_LEGEND_COLORS) })),
});

const casesCardSchema = z.strictObject({
  type: z.literal('cases'),
  title: text,
  cases: z.array(z.strictObject({ name: text, body: text })).min(1),
});

const sourcesCardSchema = z.strictObject({
  type: z.literal('sources'),
  title: text,
  sources: z.array(z.strictObject({ caption: text, details: z.array(text).min(1) })).min(1),
});

const tableCardSchema = z
  .strictObject({
    type: z.literal('table'),
    title: text,
    columns: z.array(text).min(1),
    rows: z.array(z.array(text)).min(1),
  })
  .refine((card) => card.rows.every((row) => row.length === card.columns.length), {
    message: 'every table row must have one cell per column',
    path: ['rows'],
  });

export const evidenceCardSchema = z.discriminatedUnion('type', [
  itemsCardSchema,
  timelineCardSchema,
  mapCardSchema,
  casesCardSchema,
  sourcesCardSchema,
  tableCardSchema,
]);
export type EvidenceCard = z.infer<typeof evidenceCardSchema>;
export type EvidenceCardType = EvidenceCard['type'];

export const evidenceSchema = z
  .strictObject({
    fictional: z.boolean(),
    /** "Fictional example created for this lesson." when fictional, otherwise null. */
    label: text.nullable(),
    question: text,
    cards: z.array(evidenceCardSchema).min(1),
  })
  .refine((e) => !e.fictional || e.label !== null, {
    message: 'fictional evidence needs its label',
    path: ['label'],
  });
export type Evidence = z.infer<typeof evidenceSchema>;

// ------------------------------------------------------------------------ read

export const readSectionSchema = z.strictObject({
  heading: text,
  /** Standard English. */
  text,
  /** Simpler English. */
  simpler: text,
});
export type ReadSection = z.infer<typeof readSectionSchema>;

export const glossaryEntrySchema = z.strictObject({
  word: text,
  /** Other forms of the word that should also be marked (plurals and so on). */
  forms: z.array(text).optional(),
  definition: text,
  example: text,
});
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;

export const choiceOptionSchema = z.strictObject({
  text,
  correct: z.boolean(),
  feedback: text,
});
export type ChoiceOptionData = z.infer<typeof choiceOptionSchema>;

export const choiceCheckSchema = z
  .strictObject({
    type: z.literal('choice'),
    question: text,
    options: z.array(choiceOptionSchema).length(3),
  })
  .refine((c) => c.options.filter((o) => o.correct).length === 1, {
    message: 'a choice check needs exactly one correct option',
    path: ['options'],
  });
export type ChoiceCheck = z.infer<typeof choiceCheckSchema>;

export const thinkCheckSchema = z.strictObject({
  type: z.literal('think'),
  question: text,
  placeholder: text,
  optional: z.boolean(),
});
export type ThinkCheck = z.infer<typeof thinkCheckSchema>;

export const quickCheckSchema = z.discriminatedUnion('type', [choiceCheckSchema, thinkCheckSchema]);
export type QuickCheck = z.infer<typeof quickCheckSchema>;

export const readSchema = z.strictObject({
  sections: z.array(readSectionSchema).min(2).max(3),
  glossary: z.array(glossaryEntrySchema).min(1),
  checks: z.array(quickCheckSchema).min(1),
});
export type Read = z.infer<typeof readSchema>;

// ------------------------------------------------------------- other stages

export const writeSchema = z.strictObject({
  prompt: text,
  sentenceStarters: z.array(text).min(1),
  planningBoxes: z.array(text).min(1),
  selfCheck: z.array(text).min(1),
  /** Model answer; shown only after the learner has written something or asks. */
  example: text,
});
export type Write = z.infer<typeof writeSchema>;

export const speakSchema = z.strictObject({
  partnerTask: text,
  independentTask: text,
});
export type Speak = z.infer<typeof speakSchema>;

export const replacementSuggestionSchema = z.strictObject({
  title: text,
  channel: text,
  youtubeUrl: z.url(),
  why: text,
  verify: z.boolean(),
});
export type ReplacementSuggestion = z.infer<typeof replacementSuggestionSchema>;

export const watchSchema = z.strictObject({
  /** YouTube video id; embedded from youtube-nocookie.com only after the learner taps play. */
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'must be an 11-character YouTube id'),
  title: text,
  channel: text,
  durationSeconds: z.number().int().positive().nullable(),
  why: text,
  beforeQuestion: text,
  afterQuestion: text,
  /** The written version ("Read instead"). */
  summary: text,
  keyPoints: z.array(text).min(1),
  /** A note for educators, or null. */
  contentNote: text.nullable(),
  /** For the team: a possible better video. Not shown to learners. */
  replacementSuggestion: replacementSuggestionSchema.nullable(),
});
export type Watch = z.infer<typeof watchSchema>;

export const reflectPromptSchema = z.strictObject({
  text,
  required: z.boolean(),
});
export type ReflectPrompt = z.infer<typeof reflectPromptSchema>;

export const reflectSchema = z.strictObject({
  prompts: z
    .array(reflectPromptSchema)
    .min(1)
    .refine((prompts) => prompts.some((p) => p.required), { message: 'one reflect prompt must be required' }),
  completionMessage: text,
});
export type Reflect = z.infer<typeof reflectSchema>;

export const visualSchema = z.strictObject({
  type: z.enum(['map', 'timeline', 'diagram', 'illustration']),
  /** For the team: what the picture should show. Not shown to learners. */
  description: text,
  /** Alt text for the picture once it exists. */
  alt: text,
  /**
   * The picture: a path to an SVG in content/visuals/, relative to content/
   * (for example "visuals/L10.svg"). Only a local path is allowed, never a
   * URL: a picture from another server would break the privacy and offline
   * rules (CLAUDE.md 1 and 2). getVisualUrl() turns it into the built file's URL.
   */
  src: z.string().regex(/^visuals\/[A-Za-z0-9_-]+\.svg$/, 'must be a path like "visuals/L10.svg" (an SVG in content/visuals/)'),
});
export type Visual = z.infer<typeof visualSchema>;

export const sourceLinkSchema = z.strictObject({
  label: text,
  url: z.url(),
});
export type SourceLink = z.infer<typeof sourceLinkSchema>;

// ---------------------------------------------------------------------- lesson

export const lessonSchema = z.strictObject({
  /** Stable slug used in URLs: /lesson/:id/:stage. */
  id: slug,
  /** The Base44 id (l6, history-scale, ...). Old URLs redirect from it. */
  oldId: text,
  number: z.number().int().positive(),
  section: sectionIdSchema,
  title: text,
  essentialQuestion: text,
  learningGoal: text,
  /** [min, max] minutes; show as "About 30–50 min". */
  estimatedMinutes: z
    .tuple([z.number().int().positive(), z.number().int().positive()])
    .refine(([min, max]) => min <= max, { message: 'min must not be more than max' }),
  warmUp: z.strictObject({
    question: text,
    options: z.array(text).min(2).max(4).optional(),
  }),
  evidence: evidenceSchema,
  read: readSchema,
  write: writeSchema,
  speak: speakSchema,
  watch: watchSchema,
  reflect: reflectSchema,
  visual: visualSchema.nullable(),
  sources: z.array(sourceLinkSchema),
  /**
   * Notes for teachers about sensitive topics in this lesson: what may be
   * hard or personal for learners, what never to ask, which video to
   * preview. The educator pages show them first, marked. Can be empty.
   */
  sensitiveNotes: z.array(text),
  /** Every other note for teachers: local examples to swap in, teaching tips. */
  educatorNotes: z.array(text),
  /** For reviewers: what changed from Base44. Not shown to learners. */
  changes: z.array(text),
});
export type Lesson = z.infer<typeof lessonSchema>;

// ------------------------------------------------------- quizzes (section checks)

export { QUIZ_SKILLS };
export const quizSkillSchema = z.enum(QUIZ_SKILLS);
export type QuizSkill = z.infer<typeof quizSkillSchema>;

const quizStimulusTextSchema = z.strictObject({
  type: z.literal('text'),
  title: text,
  body: text,
});

const quizStimulusItemsSchema = z.strictObject({
  type: z.literal('items'),
  title: text,
  items: z.array(text).min(1),
});

export const quizStimulusSchema = z.discriminatedUnion('type', [quizStimulusTextSchema, quizStimulusItemsSchema]);
export type QuizStimulus = z.infer<typeof quizStimulusSchema>;

export const quizQuestionSchema = z
  .strictObject({
    /** Unique within the file, e.g. "history-01". */
    id: slug,
    /** The lesson number this question is based on. */
    lesson: z.number().int().positive(),
    skill: quizSkillSchema,
    /** A short made-up example the question refers to, shown above it. */
    stimulus: quizStimulusSchema.nullable(),
    question: text,
    options: z.array(choiceOptionSchema).length(3),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'a quiz question needs exactly one correct option',
    path: ['options'],
  });
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizResultsSchema = z.strictObject({
  /** Shown for a high score (8+ of 10, 10+ of 12). */
  high: text,
  /** Shown for a middle score. */
  middle: text,
  /** Shown for a low score (under half). */
  low: text,
});
export type QuizResults = z.infer<typeof quizResultsSchema>;

export const quizFileSchema = z.strictObject({
  section: sectionIdSchema,
  title: text,
  intro: text,
  questions: z.array(quizQuestionSchema).min(1),
  results: quizResultsSchema,
});
export type QuizFile = z.infer<typeof quizFileSchema>;
