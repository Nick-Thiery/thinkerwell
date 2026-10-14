// What `npm run videos:apply` and `npm run videos:report` share: reading the
// candidates (docs/notes/local-videos/<lang>.json, the research notes), the
// language's videos file (content/<lang>/videos.json) and the English lessons.
// docs/notes/local-language-videos.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { checkLocalVideos } from '../../src/content/load.ts';
import type { LocalVideosFile } from '../../src/content/schema.ts';
import { LOCALES } from '../../src/i18n/locales.ts';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

/** A researched candidate, as docs/notes/local-videos/<lang>.json has it (only what apply reads). */
export interface Candidate {
  youtubeId: string;
  title: string;
  channel: string;
  durationSeconds: number | null;
  verifiedByOembed?: boolean;
  why: string;
  beforeQuestion: string;
  afterQuestion: string;
  summary: string;
  summaryBasis: string;
  keyPoints: string[];
  contentNote: string | null;
}

export interface CandidatesFile {
  language: string;
  lessons: Record<string, { primary?: Candidate | null; backup?: Candidate | null; noGoodMatch?: boolean }>;
}

/** The languages whose lessons are translated (src/i18n/locales.ts): the ones that can have videos of their own. */
export const VIDEO_LANGUAGES = LOCALES.filter((locale) => locale.content).map((locale) => locale.code);

export const videosPath = (code: string, root = ROOT) => path.join(root, 'content', code, 'videos.json');
export const candidatesPath = (code: string, root = ROOT) => path.join(root, 'docs', 'notes', 'local-videos', `${code}.json`);

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

/** A language's videos file, or an empty one when it has none yet. */
export function readVideosFile(code: string, root = ROOT): LocalVideosFile {
  const file = videosPath(code, root);
  return existsSync(file) ? (readJson(file) as LocalVideosFile) : { language: code, lessons: {} };
}

export function readCandidates(code: string, root = ROOT): CandidatesFile | null {
  const file = candidatesPath(code, root);
  return existsSync(file) ? (readJson(file) as CandidatesFile) : null;
}

/** The English lesson files by path (content/lessons/L01.json), as the build reads them. */
export function readEnglishLessons(root = ROOT): Record<string, { id: string; number: number; title: string; watch: { youtubeId: string; title: string; channel: string } }> {
  const dir = path.join(root, 'content', 'lessons');
  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => /^L\d\d\.json$/.test(name))
      .sort()
      .map((name) => [`content/lessons/${name}`, readJson(path.join(dir, name)) as never]),
  );
}

/** "L05", "l5" or "5" as the lesson key "L05", or null when it isn't one. */
export function lessonKey(text: string): string | null {
  const match = /^l?(\d{1,2})$/i.exec(text.trim());
  return match ? `L${match[1]!.padStart(2, '0')}` : null;
}

/** Checks a whole videos file the way the build does (schema, lesson names, English duplicates). Returns the problems, not a throw. */
export function videosProblems(code: string, file: unknown, root = ROOT): string[] {
  try {
    checkLocalVideos(code, file, readEnglishLessons(root));
    return [];
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).split('\n');
  }
}

export type { LocalVideosFile };
