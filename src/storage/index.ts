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
export {
  findContinueTarget,
  isLessonComplete,
  latestJournalEntry,
  nextStageForLesson,
  progressByLessonId,
  sectionProgress,
  stagesDoneForLesson,
  totalLessonsCompleted,
  type ContinueTarget,
  type JournalEntry,
  type ProgressByLessonId,
  type SectionProgress,
} from './progress';
