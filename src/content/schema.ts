/**
 * Zod schemas for content/course.json and content/lessons/*.json, matching the
 * files exactly as they are (docs/content/SPEC.md section 3). Objects are
 * strict: an unknown field is an error, so a content change that adds a field
 * must update this file too. The content test (content.test.ts) parses every
 * file with these schemas.
 */
import { z } from 'zod';
import { LOCALES, SOURCE_LOCALE } from '../i18n/locales.ts';
import { QUIZ_SKILLS } from './quizSkills.ts';
import { STAGES } from './stages.ts';

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

/** Every language a glossary meaning can be in: the listed languages other than English (src/i18n/locales.ts). */
// Not a language whose lessons are translated too (Indonesian): its learners
// read the key words, and their meanings, in their own language already.
export const GLOSSARY_MEANING_LOCALES = LOCALES.filter((locale) => locale.code !== SOURCE_LOCALE && !locale.content).map((locale) => locale.code) as [
  string,
  ...string[],
];

/** The longest short meaning a glossary word can carry in another language. */
export const GLOSSARY_MEANING_MAX = 120;

/**
 * A short meaning of a glossary word in a learner's own language, keyed by
 * language code ("fa-AF"). One line, written or checked by a native
 * speaker (docs/TRANSLATING.md); never machine translation.
 */
const glossaryMeaningSchema = z
  .string()
  .trim()
  .min(1)
  .max(GLOSSARY_MEANING_MAX, `a meaning in another language is at most ${GLOSSARY_MEANING_MAX} characters`)
  .refine((value) => !/[\n\r]/.test(value), 'a meaning in another language is one line');

export const glossaryEntrySchema = z.strictObject({
  word: text,
  /** Other forms of the word that should also be marked (plurals and so on). */
  forms: z.array(text).optional(),
  definition: text,
  example: text,
  /**
   * Optional: the word's meaning in other languages, shown under the English
   * definition when the learner's interface is in that language. The lesson
   * itself stays English. Keys are language codes from src/i18n/locales.ts
   * (not English).
   */
  translations: z.partialRecord(z.enum(GLOSSARY_MEANING_LOCALES), glossaryMeaningSchema).optional(),
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

// ------------------------------------------------------------------ any course
//
// Our World's types above are the narrowest (its four section ids, a Base44
// id on every lesson). Pages that show any course's lessons (the lesson
// player, its print view and teacher guide) use these instead; an Our World
// lesson or section is one too. src/content/courses.ts lists the courses.

/** A section of any course. */
export type CourseSection = Omit<Section, 'id'> & { id: string };
/** A lesson of any course: Digital World's have no Base44 id, sections of their own and may have an activity. */
export type CourseLesson = Omit<Lesson, 'oldId' | 'section'> & { oldId: string | null; section: string; activity?: Activity };
/** Any course's course.json. */
export type AnyCourseFile = Omit<CourseFile, 'sections'> & { sections: CourseSection[] };

// ------------------------------------------------------------------ activities
//
// A Digital World lesson can have one hands-on activity
// (docs/content/DIGITAL_WORLD_SPEC.md section 5.2), with fields every
// activity has and fields of its own type. src/courses/digital-world/
// activities/ has a player for each type. `saves`, `offline` and the
// train-model and compare-results notes are for the team and never shown.
// Cross-checks the schema can't make (a round's expected results, a
// suggested group that exists) are in ./activityChecks.ts.

/** Where an activity sits: Read, after the evidence; or Write, before the writing task. */
export const ACTIVITY_PLACEMENTS = ['after-evidence', 'before-prompt'] as const;
export type ActivityPlacement = (typeof ACTIVITY_PLACEMENTS)[number];

const activityBase = {
  stage: z.enum(STAGES),
  placement: z.enum(ACTIVITY_PLACEMENTS),
  /** Learner-facing. */
  title: text,
  instructions: text,
  /** For the team: what is saved with the learner's lesson work. Not shown. */
  saves: text,
  /** For the team: how it works with no network. Not shown. */
  offline: text,
};

const idLabelSchema = z.strictObject({ id: slug, label: text });

const oneCorrect = (options: readonly { correct: boolean }[]) => options.filter((option) => option.correct).length === 1;

/** A choice question inside an activity, written like a quick check: one right option, feedback on each. */
export const activityQuestionSchema = z
  .strictObject({
    question: text,
    options: z.array(choiceOptionSchema).min(2).max(4),
  })
  .refine((q) => oneCorrect(q.options), { message: 'a question needs exactly one correct option', path: ['options'] });
export type ActivityQuestion = z.infer<typeof activityQuestionSchema>;

/** `sort`: put each item in a group. No score; each item's feedback says what most people would say and why. */
export const sortActivitySchema = z.strictObject({
  type: z.literal('sort'),
  ...activityBase,
  groups: z.array(idLabelSchema).min(2).max(4),
  items: z
    .array(
      z.strictObject({
        id: slug,
        text,
        /** The group most people would choose (a group id; a "hard to say" group is one too). */
        suggested: slug,
        feedback: text,
      }),
    )
    .min(2),
});

const leafCardSchema = z.strictObject({
  id: slug,
  description: text,
  /** The label the gardener gives it: a label id. */
  gardenerSays: slug,
  /** One number from 0 to 10 per feature, in the features' order. */
  features: z.array(z.number().min(0).max(10)).min(1),
});

const trainRoundSchema = z.strictObject({
  id: slug,
  title: text,
  /** Example ids added this round (the earlier rounds' stay). */
  addExamples: z.array(slug),
  /** Test leaf ids the model guesses this round. */
  test: z.array(slug).min(1),
  /** What the model gets with every example labelled like the gardener (checked in ./activityChecks.ts). */
  expectedIfLabelledLikeTheGardener: z.strictObject({
    right: z.number().int().min(0),
    of: z.number().int().positive(),
    wrong: z.array(slug),
  }),
  debrief: text,
});

/** `train-model` (Lesson 2): teach a nearest-neighbour model with leaf cards, round by round (spec section 6). */
export const trainModelActivitySchema = z.strictObject({
  type: z.literal('train-model'),
  ...activityBase,
  labels: z.array(idLabelSchema).length(2),
  method: z.literal('nearest-neighbour'),
  k: z.literal(1),
  features: z.array(z.strictObject({ id: slug, label: text, scale: text })).min(1),
  examples: z.array(leafCardSchema).min(1),
  tests: z.array(leafCardSchema).min(1),
  rounds: z.array(trainRoundSchema).min(1),
  /** For the team: what free play allows. Not shown. */
  freePlay: text,
  /** For the team: how a guess is explained. Not shown. */
  explainGuess: text,
});

/** `compare-results` (Lesson 3): find the group a tool gets wrong most often, then say whose examples were missing. */
export const compareResultsActivitySchema = z.strictObject({
  type: z.literal('compare-results'),
  ...activityBase,
  /** What the numbers count ("Words typed correctly"). */
  measure: text,
  groups: z
    .array(z.strictObject({ id: slug, label: text, right: z.number().int().min(0), of: z.number().int().positive() }))
    .min(2),
  /** The group with the most mistakes. */
  mostMistakes: slug,
  /** Shown once a group has been tapped (any group). */
  afterTap: activityQuestionSchema,
  /** For the team: an optional extension. Not shown. */
  extension: text.optional(),
});

/** `check-claim` (Lesson 5): a made-up post, sources to open in any order, then a question that is never locked. */
export const checkClaimActivitySchema = z.strictObject({
  type: z.literal('check-claim'),
  ...activityBase,
  claim: z.strictObject({ from: text, text }),
  /** The questions to ask first. */
  askFirst: z.array(text).min(1),
  sources: z.array(z.strictObject({ id: slug, name: text, who: text, says: text })).min(1),
  question: activityQuestionSchema,
});

/** `spot-signs` (Lesson 6): tap the warning signs in made-up messages. No score; "Show all signs" is always there. */
export const spotSignsActivitySchema = z.strictObject({
  type: z.literal('spot-signs'),
  ...activityBase,
  signs: z.array(idLabelSchema).min(1),
  /** Shown for a part that isn't a warning sign. */
  notASign: text,
  messages: z
    .array(
      z.strictObject({
        id: slug,
        from: text,
        parts: z
          .array(
            z.strictObject({
              text,
              /** A sign id, or null for a part that isn't a sign. */
              sign: slug.nullable(),
              /** Why it is a sign (every sign part has one). */
              feedback: text.optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

/** `ask-tool` (Lesson 8): a labelled pretend tool with pre-written answers. Never a real AI model (spec 5.6). */
export const askToolActivitySchema = z.strictObject({
  type: z.literal('ask-tool'),
  ...activityBase,
  /** Always shown: it says the tool is pretend. */
  toolLabel: text,
  improve: z
    .strictObject({
      start: z.strictObject({ prompt: text, answer: text }),
      question: text,
      options: z.array(z.strictObject({ prompt: text, answer: text, correct: z.boolean(), feedback: text })).min(2).max(4),
    })
    .refine((improve) => oneCorrect(improve.options), { message: 'a question needs exactly one correct option', path: ['options'] }),
  check: z
    .strictObject({
      prompt: text,
      /** An answer that sounds sure but is wrong. */
      answer: text,
      trustedSource: z.strictObject({ name: text, says: text }),
      question: text,
      options: z.array(choiceOptionSchema).min(2).max(4),
    })
    .refine((check) => oneCorrect(check.options), { message: 'a question needs exactly one correct option', path: ['options'] }),
});

/** `chart-check` (Lesson 9): the same numbers drawn on two scales, every bar's number written on it. */
export const chartCheckActivitySchema = z.strictObject({
  type: z.literal('chart-check'),
  ...activityBase,
  measure: text,
  bars: z.array(z.strictObject({ label: text, value: z.number() })).min(1),
  views: z
    .array(z.strictObject({ id: slug, label: text, axisStart: z.number(), axisEnd: z.number(), note: text }))
    .min(1),
  question: activityQuestionSchema,
});

/** `design-plan` (Lesson 11): plan an AI helper in steps, in the Write stage; any step can be changed again. */
export const designPlanActivitySchema = z.strictObject({
  type: z.literal('design-plan'),
  ...activityBase,
  problems: z
    .array(
      z.strictObject({
        id: slug,
        text,
        /** The learner writes this problem themselves. */
        own: z.literal(true).optional(),
      }),
    )
    .min(1),
  steps: z
    .array(
      z.strictObject({
        id: slug,
        title: text,
        kind: z.enum(['text', 'choice']),
        prompt: text,
        /** A sentence starter for a text step. */
        starter: text.optional(),
        /** A choice step's options: a design choice, so each has feedback and none is wrong. */
        options: z.array(z.strictObject({ text, feedback: text })).min(2).optional(),
        /** Questions to choose from (the feedback step). */
        questions: z.array(text).min(1).optional(),
      }),
    )
    .min(1),
});

export const activitySchema = z.discriminatedUnion('type', [
  sortActivitySchema,
  trainModelActivitySchema,
  compareResultsActivitySchema,
  checkClaimActivitySchema,
  spotSignsActivitySchema,
  askToolActivitySchema,
  chartCheckActivitySchema,
  designPlanActivitySchema,
]);
export type Activity = z.infer<typeof activitySchema>;
export type ActivityType = Activity['type'];
export type SortActivity = z.infer<typeof sortActivitySchema>;
export type TrainModelActivity = z.infer<typeof trainModelActivitySchema>;
export type CompareResultsActivity = z.infer<typeof compareResultsActivitySchema>;
export type CheckClaimActivity = z.infer<typeof checkClaimActivitySchema>;
export type SpotSignsActivity = z.infer<typeof spotSignsActivitySchema>;
export type AskToolActivity = z.infer<typeof askToolActivitySchema>;
export type ChartCheckActivity = z.infer<typeof chartCheckActivitySchema>;
export type DesignPlanActivity = z.infer<typeof designPlanActivitySchema>;
export type LeafCardData = z.infer<typeof leafCardSchema>;

// --------------------------------------------------------------- Digital World
//
// content/courses/digital-world/ (docs/content/DIGITAL_WORLD_SPEC.md): a
// preview course (src/content/courses.ts). Its lessons have every field an
// Our World lesson has, with no Base44 id, its own four sections and an
// optional activity.

export const DIGITAL_WORLD_SECTION_IDS = ['how-ai-works', 'check-what-you-see', 'use-tools-wisely', 'ai-where-you-live'] as const;
export type DigitalWorldSectionId = (typeof DIGITAL_WORLD_SECTION_IDS)[number];

export const digitalWorldSectionSchema = sectionSchema.extend({ id: z.enum(DIGITAL_WORLD_SECTION_IDS) });
export type DigitalWorldSection = z.infer<typeof digitalWorldSectionSchema>;

export const digitalWorldCourseFileSchema = courseFileSchema.extend({
  sections: z.array(digitalWorldSectionSchema).length(4),
});
export type DigitalWorldCourseFile = z.infer<typeof digitalWorldCourseFileSchema>;

export const digitalWorldLessonSchema = lessonSchema.extend({
  /** No Base44 original. */
  oldId: z.null(),
  section: z.enum(DIGITAL_WORLD_SECTION_IDS),
  activity: activitySchema.optional(),
});
export type DigitalWorldLesson = z.infer<typeof digitalWorldLessonSchema>;

/** Each course's course.json and lesson schemas, by course id (src/content/courses.ts). */
export const COURSE_SCHEMAS = {
  'our-world': { course: courseFileSchema, lesson: lessonSchema },
  'digital-world': { course: digitalWorldCourseFileSchema, lesson: digitalWorldLessonSchema },
} as const;
export type CourseSchemaId = keyof typeof COURSE_SCHEMAS;

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
