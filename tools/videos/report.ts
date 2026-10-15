#!/usr/bin/env node
// npm run videos:report
//
// For each language whose lessons are translated, which lessons show a video
// in that language and which still show the English one
// (docs/notes/local-language-videos.md). A lesson uses a local video only
// when its entry in content/<lang>/videos.json says `approved: true` (and is
// complete: the same lock the app applies, src/content/localVideos.ts); every
// other lesson shows the English video, with the note that it is in English.
// Also counts the research candidates (docs/notes/local-videos/<lang>.json)
// still waiting to be watched. Exits 1 if a videos file has problems.
import { existsSync } from 'node:fs';
import { approvedLocalVideos } from '../../src/content/localVideos.ts';
import { LOCALES } from '../../src/i18n/locales.ts';
import {
  readCandidates,
  readEnglishLessons,
  readVideosFile,
  ROOT,
  statusOf,
  VIDEO_LANGUAGES,
  videosPath,
  videosProblems,
  type ReviewStatus,
} from './lib.ts';

export interface LessonLine {
  lesson: string;
  number: number;
  /** 'local': an approved video in the language; 'english': the English video. */
  source: 'local' | 'english';
  title: string;
  channel: string;
  youtubeId: string;
  /** For a local video: who approved it, and when. */
  approvedBy?: string;
  approvedOn?: string;
  /**
   * For a lesson still on the English video, where its slot stands in the candidates
   * (docs/notes/local-videos/<lang>.json): its recommended candidate's status, or 'none'.
   */
  slot?: ReviewStatus | 'none';
  /** That candidate, when there is one. */
  candidate?: { youtubeId: string; title: string; channel: string };
}

export interface LanguageReport {
  language: string;
  endonym: string;
  lessons: LessonLine[];
  /** Entries in the file that are not approved (considered, not shown). */
  pending: number;
  /** Primary candidates in the research notes that are not approved yet. */
  candidatesWaiting: number;
  problems: string[];
}

export function videoReport(root = ROOT): LanguageReport[] {
  const english = readEnglishLessons(root);
  // The languages learners can choose, and any other (a hidden preview) that already has a videos file.
  const languages = VIDEO_LANGUAGES.filter((code) => LOCALES.find((locale) => locale.code === code)?.ready || existsSync(videosPath(code, root)));
  return languages.map((language) => {
    const file = readVideosFile(language, root);
    const approved = approvedLocalVideos(file);
    const candidates = readCandidates(language, root);
    const lessons = Object.entries(english).map(([path, lesson]): LessonLine => {
      const key = path.replace(/^.*\/|\.json$/g, '');
      const local = approved.get(key);
      return local
        ? {
            lesson: key,
            number: lesson.number,
            source: 'local',
            title: local.title,
            channel: local.channel,
            youtubeId: local.youtubeId,
            approvedBy: local.approvedBy,
            approvedOn: local.approvedOn,
          }
        : {
            lesson: key,
            number: lesson.number,
            source: 'english',
            title: lesson.watch.title,
            channel: lesson.watch.channel,
            youtubeId: lesson.watch.youtubeId,
            ...slotOf(candidates?.lessons[key]),
          };
    });
    const candidatesWaiting = candidates
      ? Object.entries(candidates.lessons).filter(([key, entry]) => entry.primary && !approved.has(key)).length
      : 0;
    return {
      language,
      endonym: LOCALES.find((locale) => locale.code === language)?.endonym ?? language,
      lessons,
      pending: Object.values(file.lessons).filter((entry) => !entry.approved).length,
      candidatesWaiting,
      problems: videosProblems(language, file, root),
    };
  });
}

/** Where a lesson's slot stands: the recommended candidate's status, else the best status among the videos looked at. */
function slotOf(slot: import('./lib.ts').CandidateSlot | undefined): Pick<LessonLine, 'slot' | 'candidate'> {
  const primary = slot?.primary;
  if (primary) return { slot: statusOf(primary), candidate: { youtubeId: primary.youtubeId, title: primary.title, channel: primary.channel } };
  const others = slot?.screened ?? [];
  const unverified = others.find((video) => statusOf(video) === 'unverified');
  const shown = unverified ?? others[0];
  if (!shown) return { slot: 'none' };
  return { slot: statusOf(shown), candidate: { youtubeId: shown.youtubeId, title: shown.title, channel: shown.channel } };
}

const SLOT_WORDS: Record<ReviewStatus | 'none', string> = {
  prescreened: 'prescreened, waiting for a reviewer',
  unverified: 'unverified, a person must watch it',
  rejected: 'rejected',
  none: 'no candidate',
};

export function formatReport(reports: LanguageReport[]): string {
  const lines: string[] = [];
  for (const report of reports) {
    const local = report.lessons.filter((line) => line.source === 'local');
    lines.push(`${report.language} (${report.endonym}): ${local.length} of ${report.lessons.length} lessons use a video in the language, ${report.lessons.length - local.length} use the English video`);
    for (const line of report.lessons) {
      const how = line.source === 'local' ? `local    approved by ${line.approvedBy} on ${line.approvedOn}` : 'English';
      lines.push(`  ${line.lesson}  ${how.padEnd(10)}  ${line.title} (${line.channel}) [${line.youtubeId}]`);
      if (line.source === 'english' && line.slot) {
        const candidate = line.candidate ? `: ${line.candidate.title} (${line.candidate.channel}) [${line.candidate.youtubeId}]` : '';
        lines.push(line.slot === 'none' ? '         no candidate yet' : `         candidate ${SLOT_WORDS[line.slot]}${candidate}`);
      }
    }
    if (report.pending > 0) lines.push(`  ${report.pending} entr${report.pending === 1 ? 'y is' : 'ies are'} in the file but not approved (never shown).`);
    if (report.candidatesWaiting > 0) lines.push(`  ${report.candidatesWaiting} researched candidate${report.candidatesWaiting === 1 ? '' : 's'} in docs/notes/local-videos/${report.language}.json still need watching.`);
    for (const problem of report.problems) lines.push(`  PROBLEM ${problem}`);
    lines.push('');
  }
  return lines.join('\n');
}

function main(): void {
  const reports = videoReport();
  console.log(formatReport(reports));
  if (reports.some((report) => report.problems.length > 0)) process.exit(1);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
