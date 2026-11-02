/**
 * Which languages have recordings, and where (docs/notes/recorded-audio.md).
 * ./recordings.json is made by `npm run audio:generate`: for each language,
 * its timings file, how many recordings there are and how big they are in
 * all. The recordings themselves are in public/audio/<lang>/, downloaded
 * only when Listen plays them or a teacher downloads them in Settings.
 *
 * A preview course's recordings (November 2026) are kept apart, in
 * public/audio/<lang>/<course>/ with timings of their own
 * (./courseRecordings.json, `npm run audio:generate -- --all-courses`), so a
 * device without the preview downloads nothing of them. Each set is a
 * "track": a language ("en", "id") for Our World, "<lang>/<course>"
 * ("id/digital-world") for a preview course.
 */
import { DEFAULT_COURSE_ID } from '../content/courses';
import type { ListenItem } from '../speech/sentences';
import courseIndex from './courseRecordings.json';
import index from './recordings.json';
import { piecesHash } from './textHash';

export interface RecordingsOfLanguage {
  /** The timings file's address: /audio/<lang>/timings.<hash>.json. */
  timings: string;
  files: number;
  bytes: number;
}

/** A section's recording, as Listen asks for it. */
export interface RecordingRef {
  /** The track: "en", "id" (Our World), or "id/digital-world" (a preview course's). */
  lang: string;
  /** "<lesson id>/<standard|simpler>/<part>", or "sample". */
  key: string;
  /** What the section says now (piecesHash): a recording is played only when it says the same. */
  hash: string;
}

/** What `npm run audio:generate` recorded. */
const generated: Readonly<Record<string, RecordingsOfLanguage>> = index;
let recordings = generated;
type CourseIndex = Readonly<Record<string, Readonly<Record<string, RecordingsOfLanguage>>>>;
const generatedCourses: CourseIndex = courseIndex;
let courseRecordings = generatedCourses;

/** A track's language and course: "id/digital-world" → ["id", "digital-world"]; "id-ID" → ["id", undefined]. */
function splitTrack(track: string): [string, string | undefined] {
  const slash = track.indexOf('/');
  return slash < 0 ? [recordingLang(track), undefined] : [track.slice(0, slash), track.slice(slash + 1)];
}

/** The track a course's recordings are in: the language for Our World, "<lang>/<course>" for a preview course. */
export function recordingTrack(speechLang: string, courseId?: string): string {
  const lang = recordingLang(speechLang);
  return courseId && courseId !== DEFAULT_COURSE_ID ? `${lang}/${courseId}` : lang;
}

/** The recordings of one track ("en", "id", a speech tag such as "id-ID", or "id/digital-world"), or undefined. */
export function recordingsOf(track: string): RecordingsOfLanguage | undefined {
  const [lang, course] = splitTrack(track);
  return course ? courseRecordings[course]?.[lang] : recordings[lang];
}

/** The languages with recordings of Our World. */
export function recordedLanguages(): string[] {
  return Object.keys(recordings);
}

/** A speech tag's language, as the recordings are kept: "en-GB" → "en", "id-ID" → "id". */
export function recordingLang(speechLang: string): string {
  return speechLang.toLowerCase().split(/[-_]/)[0] ?? speechLang;
}

/** A recording's address: /audio/<lang>/<file>, or /audio/<lang>/<course>/<file>. */
export function audioUrl(track: string, file: string): string {
  const [lang, course] = splitTrack(track);
  return course ? `/audio/${lang}/${course}/${file}` : `/audio/${lang}/${file}`;
}

/** The text of each piece, as the recordings' fingerprint counts them. */
export function piecesText(items: readonly ListenItem[]): string[] {
  return items.map((item) => (typeof item === 'string' ? item : item.text));
}

/** The recording to ask for, for what Listen is about to read (in a course's lessons: its own); null when there are none. */
export function recordingRef(speechLang: string, key: string, items: readonly ListenItem[], courseId?: string): RecordingRef | null {
  const track = recordingTrack(speechLang, courseId);
  return recordingsOf(track) ? { lang: track, key, hash: piecesHash(piecesText(items)) } : null;
}

/** The key of one section's recording: "<lesson id>/<standard|simpler>/<part>". */
export function sectionKey(lessonId: string, level: string, part: number): string {
  return `${lessonId}/${level}/${part}`;
}

/** For tests: which recordings there are ({} for none, as the unit tests start), and the courses' (none unless given). */
export function setRecordingsForTests(next: Readonly<Record<string, RecordingsOfLanguage>> | null, courses: CourseIndex | null = null): void {
  recordings = next ?? generated;
  courseRecordings = courses ?? (next ? {} : generatedCourses);
}
