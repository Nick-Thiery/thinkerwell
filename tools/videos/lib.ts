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

/**
 * Where a candidate stands (docs/notes/local-language-videos.md):
 * - 'prescreened': its captions were read (by Claude, overnight) and it fits; it has draft questions and a draft
 *   written version, and is recommended to a reviewer. Only a prescreened candidate can be approved.
 * - 'unverified': it couldn't be checked (no captions, or YouTube wouldn't play it): a person must watch it first.
 * - 'rejected': not suitable, with the reason in `screening.notes`.
 * A candidate without a status (the older research notes) counts as prescreened.
 */
export type ReviewStatus = 'prescreened' | 'unverified' | 'rejected';

/** How a candidate was checked, by whom and when, and what they found (for the team, in English). */
export interface Screening {
  by: string;
  on: string;
  notes: string;
}

/** A video that was looked at for a lesson but isn't the one recommended. */
export interface ScreenedVideo {
  youtubeId: string;
  title: string;
  channel: string;
  channelUrl?: string;
  fullDurationSeconds?: number | null;
  /** 'manual', 'auto' (YouTube's automatic captions), 'none', 'broken' or 'unknown'. */
  captions?: string;
  /** YouTube has made an AI-dubbed soundtrack of it, which it may play instead of the original. */
  autoDubbed?: boolean;
  verifiedByOembed?: boolean;
  reviewStatus?: ReviewStatus;
  screening?: Screening;
}

/** The recommended candidate for a lesson, as docs/notes/local-videos/<lang>.json has it. */
export interface Candidate extends ScreenedVideo {
  /** For the part of a longer video, the part's length; otherwise the video's. */
  durationSeconds: number | null;
  startSeconds?: number;
  endSeconds?: number;
  spokenLanguage?: string;
  why: string;
  beforeQuestion: string;
  afterQuestion: string;
  /** Which of the two questions differ from the lesson's translated ones (adapted to this video). */
  questionsChanged?: string[];
  summary: string;
  summaryBasis: string;
  keyPoints: string[];
  contentNote: string | null;
  /** Fits only in part: the screening suggests keeping the English video unless the reviewer likes it. */
  weakFit?: boolean;
}

export interface CandidateSlot {
  primary?: Candidate | null;
  backup?: Candidate | null;
  noGoodMatch?: boolean;
  /** Every other video looked at for the lesson, with its status. */
  screened?: ScreenedVideo[];
}

export interface CandidatesFile {
  language: string;
  about?: string;
  lessons: Record<string, CandidateSlot>;
}

/** A candidate's status; one without a status (the older research notes) counts as prescreened. */
export const statusOf = (video: ScreenedVideo): ReviewStatus => video.reviewStatus ?? 'prescreened';

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
