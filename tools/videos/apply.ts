#!/usr/bin/env node
// npm run videos:apply -- <lang> <L05,L09,...> --approved-by "Name"
//     [--accept-unverified-summary] [--checked-audio] [--date 2026-10-14] [--dry-run]
//
// Approves local-language Watch videos (docs/notes/local-language-videos.md).
// Copies each listed lesson's PRIMARY candidate from the research notes
// (docs/notes/local-videos/<lang>.json) into content/<lang>/videos.json with
// `approved: true`, who approved it and today's date. Nothing is shown to
// learners until this has been run for the lesson, so run it only after a
// person who speaks the language has watched the whole video with the sound
// on and read the written version against it: `--approved-by` is that
// person's statement that they did.
//
// Refuses (and writes nothing) when:
// - a lesson has no primary candidate, it isn't "prescreened" (an unverified or
//   rejected one can't be approved), or YouTube's check didn't accept it;
// - YouTube has an AI-dubbed soundtrack of it (`autoDubbed`), unless
//   `--checked-audio` says the reviewer played it on the learners' devices and
//   heard the original language;
// - the candidate's summary isn't based on a transcript (`summaryBasis` is
//   "description" or "title-and-description": it says what the title and the
//   description say, not what the video says), unless `--accept-unverified-summary`
//   says the person has read it against the video and it is right;
// - the result would not pass the same checks as the build (src/content/load.ts).
// Prints what changed. `--dry-run` prints it without writing.
import { writeFileSync } from 'node:fs';
import { approvedLocalVideos } from '../../src/content/localVideos.ts';
import type { ApprovedLocalVideo, LocalVideosFile } from '../../src/content/schema.ts';
import {
  readCandidates,
  readVideosFile,
  ROOT,
  VIDEO_LANGUAGES,
  videosPath,
  videosProblems,
  lessonKey,
  statusOf,
  type Candidate,
  type CandidatesFile,
} from './lib.ts';

export interface ApplyOptions {
  language: string;
  /** Lesson keys ("L05"), as lessonKey() gives them. */
  lessons: string[];
  approvedBy: string;
  /** YYYY-MM-DD. */
  approvedOn: string;
  acceptUnverifiedSummary?: boolean;
  /**
   * The reviewer has played the video on the devices learners use and heard its own soundtrack, not YouTube's
   * AI-dubbed one. Needed for a candidate YouTube has dubbed (`autoDubbed`).
   */
  checkedAudio?: boolean;
}

export interface Change {
  lesson: string;
  /** 'added' for a lesson without a local video; 'replaced' for one that had an entry. */
  kind: 'added' | 'replaced';
  title: string;
  channel: string;
  youtubeId: string;
  summaryBasis: string;
}

export interface ApplyResult {
  /** The whole file as it would be written. Equals the old file when anything was refused. */
  file: LocalVideosFile;
  changes: Change[];
  /** Why a lesson was not approved, or the file would be invalid. Nothing is written while there are any. */
  refusals: string[];
}

/** Summaries that say what the video says, not just what its title and description say. */
const TRUSTED_BASES = new Set(['transcript', 'watched']);

function approvedEntry(candidate: Candidate, options: ApplyOptions): ApprovedLocalVideo {
  return {
    approved: true as const,
    approvedBy: options.approvedBy,
    approvedOn: options.approvedOn,
    youtubeId: candidate.youtubeId,
    title: candidate.title,
    channel: candidate.channel,
    durationSeconds: candidate.durationSeconds ?? null,
    why: candidate.why,
    beforeQuestion: candidate.beforeQuestion,
    afterQuestion: candidate.afterQuestion,
    summary: candidate.summary,
    // An unknown value is caught by the build's checks below.
    summaryBasis: candidate.summaryBasis as ApprovedLocalVideo['summaryBasis'],
    keyPoints: candidate.keyPoints,
    contentNote: candidate.contentNote ?? null,
    ...(candidate.startSeconds !== undefined && candidate.endSeconds !== undefined
      ? { startSeconds: candidate.startSeconds, endSeconds: candidate.endSeconds }
      : {}),
    ...(candidate.channelUrl ? { channelUrl: candidate.channelUrl } : {}),
  };
}

/**
 * Works out what approving the listed lessons would do, without writing.
 * `candidates` and `existing` are the two files; `root` is where the English
 * lessons are read from (for the build's own checks on the result).
 */
export function planApproval(
  options: ApplyOptions,
  candidates: { lessons: CandidatesFile['lessons'] },
  existing: LocalVideosFile,
  root = ROOT,
): ApplyResult {
  const refusals: string[] = [];
  const changes: Change[] = [];
  const next: LocalVideosFile = { language: options.language, lessons: { ...existing.lessons } };

  if (!options.approvedBy.trim()) refusals.push('--approved-by "Name" is required: say who watched the videos.');
  if (options.lessons.length === 0) refusals.push('Name the lessons to approve, for example L05,L09.');

  for (const lesson of options.lessons) {
    const found = candidates.lessons[lesson];
    const candidate = found?.primary;
    if (!candidate) {
      refusals.push(`${lesson}: there is no primary candidate${found?.noGoodMatch ? ' (the research found no good match)' : ''} in docs/notes/local-videos/${options.language}.json.`);
      continue;
    }
    const status = statusOf(candidate);
    if (status !== 'prescreened') {
      refusals.push(`${lesson}: its candidate is ${status}${candidate.screening ? ` (${candidate.screening.notes})` : ''}. Only a prescreened candidate can be approved.`);
      continue;
    }
    if (candidate.autoDubbed && !options.checkedAudio) {
      refusals.push(
        `${lesson}: YouTube has an AI-dubbed soundtrack of ${candidate.youtubeId}, which it may play instead of the original. ` +
          'Play it on the devices learners use; if you hear the original language, add --checked-audio to say you did.',
      );
      continue;
    }
    if (candidate.verifiedByOembed === false) {
      refusals.push(`${lesson}: YouTube's check did not accept ${candidate.youtubeId} (it may be private or not embeddable).`);
      continue;
    }
    if (!TRUSTED_BASES.has(candidate.summaryBasis) && !options.acceptUnverifiedSummary) {
      refusals.push(
        `${lesson}: its summary is based on "${candidate.summaryBasis}", not on what the video says. ` +
          'Watch the video, check the summary and key points against it (correct them in the notes if needed), ' +
          'then add --accept-unverified-summary to say you did.',
      );
      continue;
    }
    const before = next.lessons[lesson];
    next.lessons[lesson] = approvedEntry(candidate, options);
    changes.push({
      lesson,
      kind: before ? 'replaced' : 'added',
      title: candidate.title,
      channel: candidate.channel,
      youtubeId: candidate.youtubeId,
      summaryBasis: candidate.summaryBasis,
    });
  }

  if (refusals.length === 0) {
    const sorted: LocalVideosFile = {
      language: next.language,
      lessons: Object.fromEntries(Object.entries(next.lessons).sort(([a], [b]) => a.localeCompare(b))),
    };
    const problems = videosProblems(options.language, sorted, root);
    if (problems.length === 0) return { file: sorted, changes, refusals };
    refusals.push(...problems.map((problem) => `The result would not pass the build's checks: ${problem}`));
  }
  return { file: existing, changes: [], refusals };
}

/** The file as it is written: two-space JSON and a final newline. */
export function serialiseVideos(file: LocalVideosFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

const USAGE = `Usage: npm run videos:apply -- <lang> <L05,L09,...> --approved-by "Name" [--accept-unverified-summary] [--checked-audio] [--date YYYY-MM-DD] [--dry-run]
Languages: ${VIDEO_LANGUAGES.join(', ')}`;

/** Reads the command line. Returns an error message instead of options when it can't. */
export function parseArgs(argv: string[], today = new Date().toISOString().slice(0, 10)): ApplyOptions & { dryRun: boolean } | string {
  const positional: string[] = [];
  let approvedBy = '';
  let approvedOn = today;
  let acceptUnverifiedSummary = false;
  let checkedAudio = false;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const value = (name: string): string | null => {
      if (arg === name) return argv[++i] ?? '';
      return arg.startsWith(`${name}=`) ? arg.slice(name.length + 1) : null;
    };
    const by = value('--approved-by');
    const on = value('--date');
    if (by !== null) approvedBy = by;
    else if (on !== null) approvedOn = on;
    else if (arg === '--accept-unverified-summary') acceptUnverifiedSummary = true;
    else if (arg === '--checked-audio') checkedAudio = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--')) return `Unknown option ${arg}.\n${USAGE}`;
    else positional.push(arg);
  }
  const [language, ...rest] = positional;
  if (!language || !VIDEO_LANGUAGES.includes(language)) return `Name a language whose lessons are translated.\n${USAGE}`;
  const lessons: string[] = [];
  for (const piece of rest.flatMap((part) => part.split(','))) {
    if (piece.trim() === '') continue;
    const key = lessonKey(piece);
    if (!key) return `"${piece}" is not a lesson. Write lessons like L05,L09.\n${USAGE}`;
    if (!lessons.includes(key)) lessons.push(key);
  }
  return { language, lessons, approvedBy: approvedBy.trim(), approvedOn, acceptUnverifiedSummary, checkedAudio, dryRun };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (typeof options === 'string') {
    console.error(options);
    process.exit(2);
  }
  const candidates = readCandidates(options.language);
  if (!candidates) {
    console.error(`There are no candidates for ${options.language}: docs/notes/local-videos/${options.language}.json is missing (it comes from the research pull request).`);
    process.exit(2);
  }
  const result = planApproval(options, candidates, readVideosFile(options.language));
  if (result.refusals.length > 0) {
    console.error('Nothing was changed.');
    for (const refusal of result.refusals) console.error(`  ${refusal}`);
    process.exit(1);
  }
  for (const change of result.changes) {
    console.log(`${change.lesson}  ${change.kind}  ${change.title} (${change.channel}) [${change.youtubeId}], summary from ${change.summaryBasis}`);
  }
  const approved = approvedLocalVideos(result.file);
  if (options.dryRun) {
    console.log(`\nDry run: ${videosPath(options.language)} was not written. ${approved.size} lesson${approved.size === 1 ? '' : 's'} would use a video in ${options.language}.`);
    return;
  }
  writeFileSync(videosPath(options.language), serialiseVideos(result.file));
  console.log(`\nWrote content/${options.language}/videos.json: ${approved.size} lesson${approved.size === 1 ? '' : 's'} now use a video in ${options.language}, approved by ${options.approvedBy} on ${options.approvedOn}.`);
  console.log('Learners will see these once this is merged and deployed. Next: npm run videos:report, npm run check:content, npm test.');
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
