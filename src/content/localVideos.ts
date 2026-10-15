/**
 * Local-language videos (docs/notes/local-language-videos.md): for a language
 * whose lessons are translated (Bahasa Indonesia, Bahasa Melayu), a lesson
 * can have its own Watch video, in that language, from content/<code>/videos.json,
 * in place of the English one.
 *
 * Nothing switches on by itself. A video is used only when its entry says
 * `approved: true` (a person watched it and put their name and the date on
 * it: `npm run videos:apply`). Pure, with no values imported and no zod, so
 * the browser, the build and the tools all use it. The build has already
 * checked the file (src/content/load.ts, checkLocalVideos) and dropped every entry
 * that isn't approved before the browser downloads it; the checks here are a
 * second lock, so a file that somehow got through still can't put an unreviewed
 * video in front of a learner.
 */
import type { ApprovedLocalVideo, LocalVideosFile, Watch } from './schema.ts';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The entry as an approved video, or null. Null for anything that isn't
 * complete and explicitly approved: `approved` must be exactly `true`, with
 * who approved it and when, a well-formed YouTube id, and the written version.
 */
export function approvedLocalVideo(entry: unknown): ApprovedLocalVideo | null {
  if (!isObject(entry) || entry.approved !== true) return null;
  const { youtubeId, approvedBy, approvedOn, keyPoints, durationSeconds } = entry;
  if (typeof youtubeId !== 'string' || !YOUTUBE_ID.test(youtubeId)) return null;
  if (!isText(approvedBy) || !isText(approvedOn)) return null;
  if (!Array.isArray(keyPoints) || keyPoints.length === 0 || !keyPoints.every(isText)) return null;
  if (!(durationSeconds === null || (typeof durationSeconds === 'number' && Number.isInteger(durationSeconds) && durationSeconds > 0))) return null;
  for (const field of ['title', 'channel', 'why', 'beforeQuestion', 'afterQuestion', 'summary'] as const) {
    if (!isText(entry[field])) return null;
  }
  if (entry.contentNote !== null && !isText(entry.contentNote)) return null;
  // A part of a longer video: both ends, in order, and the length is the part's.
  const { startSeconds, endSeconds } = entry;
  if (startSeconds !== undefined || endSeconds !== undefined) {
    const whole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
    if (!whole(startSeconds) || !whole(endSeconds) || endSeconds <= startSeconds) return null;
    if (durationSeconds !== endSeconds - startSeconds) return null;
  }
  if (entry.channelUrl !== undefined && !(typeof entry.channelUrl === 'string' && entry.channelUrl.startsWith('https://www.youtube.com/'))) return null;
  return entry as unknown as ApprovedLocalVideo;
}

/** A language's approved videos by lesson file name ("L05"), from its videos.json (or nothing: no file, an empty one). */
export function approvedLocalVideos(file: unknown): ReadonlyMap<string, ApprovedLocalVideo> {
  const found = new Map<string, ApprovedLocalVideo>();
  const lessons = isObject(file) ? file.lessons : undefined;
  if (!isObject(lessons)) return found;
  for (const [name, entry] of Object.entries(lessons)) {
    const video = approvedLocalVideo(entry);
    if (video) found.set(name, video);
  }
  return found;
}

/** The lesson with its Watch video replaced by the approved local one. The lesson given is not changed. */
export function withLocalVideo<L extends { watch: Watch }>(lesson: L, video: ApprovedLocalVideo | undefined): L {
  if (!video) return lesson;
  const watch: Watch = {
    youtubeId: video.youtubeId,
    title: video.title,
    channel: video.channel,
    durationSeconds: video.durationSeconds,
    why: video.why,
    beforeQuestion: video.beforeQuestion,
    afterQuestion: video.afterQuestion,
    summary: video.summary,
    keyPoints: [...video.keyPoints],
    contentNote: video.contentNote,
    // The team's note about a better English video says nothing about this one.
    replacementSuggestion: null,
    localVideo: true,
    ...(video.startSeconds !== undefined && video.endSeconds !== undefined
      ? { startSeconds: video.startSeconds, endSeconds: video.endSeconds }
      : {}),
    ...(video.channelUrl ? { channelUrl: video.channelUrl } : {}),
  };
  return { ...lesson, watch };
}

/** A lesson's file name without ".json" ("L05"), from its path in the content folder. */
export function lessonKeyFromPath(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');
}

/** A parsed videos file with only the approved entries (what the build ships to the browser; pending ones stay in the repository). */
export function onlyApprovedVideos(file: LocalVideosFile): LocalVideosFile {
  return {
    language: file.language,
    lessons: Object.fromEntries(Object.entries(file.lessons).filter(([, entry]) => entry.approved)),
  };
}
