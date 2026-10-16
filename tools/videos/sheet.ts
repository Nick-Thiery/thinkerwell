#!/usr/bin/env node
// npm run videos:sheet [-- <lang> ...]
//
// Writes the review sheet for a language's own Watch videos,
// docs/notes/local-videos/review-<lang>.md (docs/notes/local-language-videos.md):
// one section per lesson, for the person who speaks the language and decides.
// For each recommended (prescreened) candidate: the link at the right minute,
// the part to watch, the questions beside the lesson's current ones, the draft
// written version and key points, what the pre-screen found, a checklist and
// the command that approves it. Then the other videos that fit too (prescreened
// alternatives, without drafts), the videos nobody could check (a person must
// watch them) and the ones turned down, with the reason.
//
// It reads docs/notes/local-videos/<lang>.json and the translated lessons; it
// changes nothing that learners see. Run it again after editing the candidates.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatDuration } from '../../src/lesson/format.ts';
import { LOCALES } from '../../src/i18n/locales.ts';
import { readCandidates, readEnglishLessons, ROOT, statusOf, VIDEO_LANGUAGES, type Candidate, type ScreenedVideo } from './lib.ts';

export const sheetPath = (code: string, root = ROOT) => path.join(root, 'docs', 'notes', 'local-videos', `review-${code}.md`);

const watchUrl = (id: string, start?: number) => `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`;
const clock = (seconds: number | null | undefined) => (seconds === null || seconds === undefined ? 'unknown' : formatDuration(seconds));
const quote = (text: string) => text.split('\n').map((line) => `> ${line}`).join('\n');

interface TranslatedWatch {
  beforeQuestion?: string;
  afterQuestion?: string;
}

function translatedWatch(code: string, key: string, root: string): TranslatedWatch {
  const file = path.join(root, 'content', code, 'lessons', `${key}.json`);
  if (!existsSync(file)) return {};
  return ((JSON.parse(readFileSync(file, 'utf8')) as { watch?: TranslatedWatch }).watch ?? {});
}

function candidateSection(code: string, key: string, number: number, title: string, video: Candidate, current: TranslatedWatch): string[] {
  const part =
    video.startSeconds !== undefined && video.endSeconds !== undefined
      ? `${clock(video.startSeconds)} to ${clock(video.endSeconds)} (${clock(video.durationSeconds)} of ${clock(video.fullDurationSeconds)})`
      : `the whole video (${clock(video.durationSeconds)})`;
  const changed = new Set(video.questionsChanged ?? []);
  const question = (field: 'beforeQuestion' | 'afterQuestion', label: string) =>
    changed.has(field)
      ? [`- **${label} (adapted to this video):** ${video[field]}`, `  - The lesson's question now: ${current[field] ?? '(none)'}`]
      : [`- **${label} (the lesson's own, kept):** ${video[field]}`];
  const flags = [
    video.weakFit ? '**Weak fit:** the pre-screen suggests keeping the English video unless you like this one.' : null,
    video.autoDubbed
      ? "**YouTube has an AI-dubbed English soundtrack of this video.** Play it on the learners' devices: if you hear English, it can't be used."
      : null,
    video.summaryBasis !== 'transcript' && video.summaryBasis !== 'watched'
      ? `**The written version was drafted from the video's ${video.summaryBasis.replace(/-/g, ' ')}, not its words** (the video has no captions). Check it carefully.`
      : null,
  ].filter((flag): flag is string => flag !== null);
  const options = [video.summaryBasis === 'transcript' || video.summaryBasis === 'watched' ? '' : ' --accept-unverified-summary', video.autoDubbed ? ' --checked-audio' : ''].join('');
  return [
    `## Lesson ${number}: ${title}`,
    '',
    `**Recommended:** [${video.title}](${watchUrl(video.youtubeId, video.startSeconds)}), by [${video.channel}](${video.channelUrl ?? watchUrl(video.youtubeId)})`,
    '',
    `- **Part to watch:** ${part}`,
    `- **Captions on YouTube:** ${video.captions ?? 'unknown'}`,
    ...flags.map((flag) => `- ${flag}`),
    '',
    `**Why this video** (shown to learners): ${video.why}`,
    '',
    ...question('beforeQuestion', 'Think first'),
    ...question('afterQuestion', 'After you watch'),
    '',
    '**Written version** ("Read instead", draft by AI: correct anything that is wrong or unclear):',
    '',
    quote(video.summary),
    '',
    '**Key points:**',
    '',
    ...video.keyPoints.map((point) => `- ${point}`),
    '',
    video.contentNote ? `**Note for teachers:** ${video.contentNote}` : '**Note for teachers:** none',
    '',
    `**What the pre-screen found:** ${video.screening?.notes ?? '(no notes)'}`,
    '',
    '**Before you approve, check:**',
    '',
    '- [ ] I watched the part above with the sound on, in the language, from start to end.',
    '- [ ] It is accurate, and right for learners aged 10 to 17, some of them refugees.',
    '- [ ] Both questions can be answered from the video and from the written version.',
    '- [ ] The written version and key points say what the video says (I corrected them in the candidates file if not).',
    '',
    `To approve it: \`npm run videos:apply -- ${code} ${key} --approved-by "Your name"${options}\``,
    '',
  ];
}

/** A video that isn't recommended: its link and what was found (the notes give its channel and length). */
function otherLine(video: ScreenedVideo): string {
  return `- [${video.title}](${watchUrl(video.youtubeId)}): ${video.screening?.notes ?? ''}`;
}

/** A prescreened alternative: its link at the part that fits, its channel, the part, and what was found. */
function alternativeLine(video: ScreenedVideo): string {
  const part =
    video.startSeconds !== undefined && video.endSeconds !== undefined
      ? `part to watch ${clock(video.startSeconds)} to ${clock(video.endSeconds)}`
      : 'the whole video';
  const channel = video.channelUrl ? `[${video.channel}](${video.channelUrl})` : video.channel;
  return `- [${video.title}](${watchUrl(video.youtubeId, video.startSeconds)}), by ${channel}, ${part}: ${video.screening?.notes ?? ''}`;
}

/** The sheet for one language, as Markdown. */
export function reviewSheet(code: string, root = ROOT): string | null {
  const candidates = readCandidates(code, root);
  if (!candidates) return null;
  const english = readEnglishLessons(root);
  const endonym = LOCALES.find((locale) => locale.code === code)?.endonym ?? code;
  const recommended: string[] = [];
  const alsoSuitable: string[] = [];
  const toWatch: string[] = [];
  const turnedDown: string[] = [];
  const nothing: string[] = [];
  for (const [file, lesson] of Object.entries(english)) {
    const key = file.replace(/^.*\/|\.json$/g, '');
    const slot = candidates.lessons[key];
    const label = `Lesson ${lesson.number}: ${lesson.title}`;
    const primary = slot?.primary;
    if (primary && statusOf(primary) === 'prescreened') {
      recommended.push(...candidateSection(code, key, lesson.number, lesson.title, primary, translatedWatch(code, key, root)));
    }
    const others = slot?.screened ?? [];
    for (const video of others) {
      const line = `- **Lesson ${lesson.number}** (${lesson.title}): ${otherLine(video).slice(2)}`;
      if (statusOf(video) === 'prescreened') alsoSuitable.push(`- **Lesson ${lesson.number}** (${lesson.title}): ${alternativeLine(video).slice(2)}`);
      else if (statusOf(video) === 'unverified') toWatch.push(line);
      else if (statusOf(video) === 'rejected') turnedDown.push(line);
    }
    if (!primary && others.every((video) => statusOf(video) === 'rejected')) nothing.push(`- ${label}`);
  }
  const count = recommended.filter((line) => line.startsWith('## ')).length;
  return [
    `# Watch videos in ${endonym}: review sheet`,
    '',
    `Made by \`npm run videos:sheet\` from \`docs/notes/local-videos/${code}.json\`. Don't edit this file: edit the candidates file and run the command again.`,
    '',
    `Every lesson shows its English video, with a note that it is in English and the written version in ${endonym}, until a person who speaks ${endonym} watches a video below and approves it. **Nothing here is approved.** The candidates were pre-screened by an AI from YouTube's captions (in a browser that was not signed in); that is a first filter, not a review. Read docs/notes/local-language-videos.md first.`,
    '',
    `${count} lesson${count === 1 ? ' has' : 's have'} a recommended video, ${alsoSuitable.length} other video${alsoSuitable.length === 1 ? ' also fits' : 's also fit'}, ${toWatch.length} video${toWatch.length === 1 ? ' still needs' : 's still need'} someone to watch ${toWatch.length === 1 ? 'it' : 'them'}, and ${nothing.length} lesson${nothing.length === 1 ? ' has' : 's have'} nothing yet.`,
    '',
    ...recommended,
    '## Also suitable',
    '',
    "These fit too, but aren't recommended: another video covers the lesson better, or as well. Most have no draft questions or written version yet. If you prefer one, say so, and it can be made the lesson's recommendation with its drafts.",
    '',
    ...(alsoSuitable.length ? alsoSuitable : ['- None.']),
    '',
    '## Videos nobody could check yet',
    '',
    'These have no captions (or YouTube would not play them), so the pre-screen could not read what they say. Watch one, and if it fits, ask for its questions and written version to be drafted.',
    '',
    ...(toWatch.length ? toWatch : ['- None.']),
    '',
    '## Videos turned down',
    '',
    ...(turnedDown.length ? turnedDown : ['- None.']),
    '',
    '## Lessons with no candidate yet',
    '',
    ...(nothing.length ? nothing : ['- None.']),
    '',
  ].join('\n');
}

function main(): void {
  const asked = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const codes = asked.length ? asked : VIDEO_LANGUAGES;
  for (const code of codes) {
    if (!VIDEO_LANGUAGES.includes(code)) {
      console.error(`${code} is not a language whose lessons are translated (${VIDEO_LANGUAGES.join(', ')}).`);
      process.exit(2);
    }
    const sheet = reviewSheet(code);
    if (sheet === null) {
      console.log(`${code}: no candidates (docs/notes/local-videos/${code}.json is missing).`);
      continue;
    }
    writeFileSync(sheetPath(code), sheet);
    console.log(`Wrote ${path.relative(ROOT, sheetPath(code))}`);
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
