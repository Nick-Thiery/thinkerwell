/**
 * Which languages have recordings, and where (docs/notes/recorded-audio.md).
 * ./recordings.json is made by `npm run audio:generate`: for each language,
 * its timings file, how many recordings there are and how big they are in
 * all. The recordings themselves are in public/audio/<lang>/, downloaded
 * only when Listen plays them or a teacher downloads them in Settings.
 */
import type { ListenItem } from '../speech/sentences';
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
  /** "en", "id". */
  lang: string;
  /** "<lesson id>/<standard|simpler>/<part>", or "sample". */
  key: string;
  /** What the section says now (piecesHash): a recording is played only when it says the same. */
  hash: string;
}

/** What `npm run audio:generate` recorded. */
const generated: Readonly<Record<string, RecordingsOfLanguage>> = index;
let recordings = generated;

/** The recordings of one language ("en", "id", or a speech tag such as "id-ID"), or undefined. */
export function recordingsOf(lang: string): RecordingsOfLanguage | undefined {
  return recordings[recordingLang(lang)];
}

/** The languages with recordings. */
export function recordedLanguages(): string[] {
  return Object.keys(recordings);
}

/** A speech tag's language, as the recordings are kept: "en-GB" → "en", "id-ID" → "id". */
export function recordingLang(speechLang: string): string {
  return speechLang.toLowerCase().split(/[-_]/)[0] ?? speechLang;
}

/** A recording's address. */
export function audioUrl(lang: string, file: string): string {
  return `/audio/${recordingLang(lang)}/${file}`;
}

/** The text of each piece, as the recordings' fingerprint counts them. */
export function piecesText(items: readonly ListenItem[]): string[] {
  return items.map((item) => (typeof item === 'string' ? item : item.text));
}

/** The recording to ask for, for what Listen is about to read; null when the language has none. */
export function recordingRef(speechLang: string, key: string, items: readonly ListenItem[]): RecordingRef | null {
  const lang = recordingLang(speechLang);
  return recordings[lang] ? { lang, key, hash: piecesHash(piecesText(items)) } : null;
}

/** The key of one section's recording: "<lesson id>/<standard|simpler>/<part>". */
export function sectionKey(lessonId: string, level: string, part: number): string {
  return `${lessonId}/${level}/${part}`;
}

/** For tests: which recordings there are ({} for none, as the unit tests start). */
export function setRecordingsForTests(next: Readonly<Record<string, RecordingsOfLanguage>> | null): void {
  recordings = next ?? generated;
}
