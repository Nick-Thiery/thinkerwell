// On-device storage: IndexedDB through idb. Nothing here leaves the device.
// Use getStore() for the app-wide store; see ./types.ts for the data.
export * from './types';
export {
  DB_NAME,
  DB_VERSION,
  SETTINGS_KEY,
  STORE_NAMES,
  migrations,
  runMigrations,
  openThinkerwellDb,
  type Migration,
  type OpenOptions,
  type ThinkerwellDB,
  type ThinkerwellStoreName,
  type UpgradeTransaction,
} from './db';
export {
  deleteAllData,
  emptyProgress,
  getStore,
  isStorageAvailable,
  openStore,
  requestPersistentStorage,
  type ThinkerwellStore,
} from './store';
export { forgetUnsavedProgress, keepUnsavedProgress } from './unsavedProgress';
export {
  buildWorkFile,
  checkWorkFile,
  checkWorkFileSize,
  serialiseWorkFile,
  workFileName,
  MAX_WORK_FILE_BYTES,
  WORK_FILE_FORMAT,
  WORK_FILE_VERSION,
  type KnownContent,
  type LearnerWork,
  type WorkFile,
  type WorkFileCheck,
  type WorkFileProblem,
} from './workFile';
export { mergeProgress, mergeQuizRecord, planImport, type ImportPlan, type ImportSummary, type LearnerOnDevice } from './mergeWork';
export {
  findContinueTarget,
  isLessonComplete,
  journalByLesson,
  latestJournalEntry,
  nextStageForLesson,
  progressByLessonId,
  sectionProgress,
  stagesDoneForLesson,
  totalLessonsCompleted,
  type ContinueTarget,
  type JournalEntry,
  type JournalLesson,
  type JournalPiece,
  type ProgressByLessonId,
  type SectionProgress,
} from './progress';
