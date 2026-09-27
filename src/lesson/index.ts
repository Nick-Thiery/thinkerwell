// The lesson player's shared logic and state (phase 4). UI lives in src/pages/lesson/.
export {
  LessonPlayerProvider,
  LessonPlayerTestProvider,
  SAVE_DEBOUNCE_MS,
  useLessonPlayer,
  type LessonPlayerMode,
  type LessonPlayerProviderProps,
  type LessonPlayerValue,
  type ProgressChange,
  type UpdateOptions,
} from './LessonPlayerContext';
export { checkSeed, hashSeed, mulberry32, seededShuffle, shuffledOrder } from './shuffle';
export { glossaryEntriesIn, glossaryForms, markGlossary, type GlossarySegment } from './glossary';
export {
  allChoiceChecksAnswered,
  applyStageEvent,
  choiceCheckIndexes,
  eventMarksStageDone,
  hasText,
  isRequiredReflectionAnswered,
  requiredReflectIndex,
  withStageDone,
  type StageEvent,
} from './progressRules';
export { clearGuestMemory, GUEST_ID, VISIT_SEED } from './guestMemory';
export { formatDuration, roundedMinutes, splitParagraphs } from './format';
export { LESSON_PHONE_QUERY, LESSON_WIDE_QUERY, useMediaQuery } from './useMediaQuery';
