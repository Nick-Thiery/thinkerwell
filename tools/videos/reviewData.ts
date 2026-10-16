// The candidates the reviewers' page shows (/review/videos,
// src/courses/video-review/): for each translated language and lesson, the
// recommended video with its drafts, the other videos that also fit, and the
// ones nobody could check. vite.config.ts serves this as a virtual module that
// only the reviewers' page imports, so it is built into assets/preview/ and
// no learner's device downloads it (src/courses/build.ts).
//
// Only what the page needs: the screening notes (English, for the team) and
// the rejected videos stay in docs/notes/local-videos/.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReviewLesson, ReviewPart, ReviewRecommendation, VideoReviewData } from '../../src/courses/video-review/types.ts';
import { statusOf, type Candidate, type CandidatesFile, type ScreenedVideo } from './lib.ts';

const part = (video: ScreenedVideo): ReviewPart => ({
  youtubeId: video.youtubeId,
  title: video.title,
  channel: video.channel,
  ...(video.channelUrl ? { channelUrl: video.channelUrl } : {}),
  ...(video.startSeconds !== undefined && video.endSeconds !== undefined ? { startSeconds: video.startSeconds, endSeconds: video.endSeconds } : {}),
});

function recommendation(video: Candidate): ReviewRecommendation {
  return {
    ...part(video),
    durationSeconds: video.durationSeconds,
    why: video.why,
    beforeQuestion: video.beforeQuestion,
    afterQuestion: video.afterQuestion,
    questionsChanged: video.questionsChanged ?? [],
    summary: video.summary,
    keyPoints: video.keyPoints,
    contentNote: video.contentNote,
    autoDubbed: video.autoDubbed === true,
    weakFit: video.weakFit === true,
    summaryFromVideo: video.summaryBasis === 'transcript' || video.summaryBasis === 'watched',
  };
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

/** Every translated language's candidates, by language code; `watch` is told each file read (for the dev server). */
export function videoReviewData(root: string, languages: readonly string[], watch: (file: string) => void = () => {}): VideoReviewData {
  const lessonKeys = Array.from({ length: 24 }, (_, index) => `L${String(index + 1).padStart(2, '0')}`).filter((key) =>
    existsSync(path.join(root, 'content', 'lessons', `${key}.json`)),
  );
  const data: VideoReviewData = {};
  for (const code of languages) {
    const file = path.join(root, 'docs', 'notes', 'local-videos', `${code}.json`);
    if (!existsSync(file)) continue;
    watch(file);
    const candidates = readJson(file) as CandidatesFile;
    const videosFile = path.join(root, 'content', code, 'videos.json');
    const approved = existsSync(videosFile)
      ? ((readJson(videosFile) as { lessons?: Record<string, { approved?: boolean }> }).lessons ?? {})
      : {};
    data[code] = lessonKeys.map((key): ReviewLesson => {
      const slot = candidates.lessons[key] ?? {};
      const primary = slot.primary && statusOf(slot.primary) === 'prescreened' ? slot.primary : null;
      const others = slot.screened ?? [];
      return {
        key,
        recommended: primary ? recommendation(primary) : null,
        alsoSuitable: others.filter((video) => statusOf(video) === 'prescreened').map(part),
        notChecked: others.filter((video) => statusOf(video) === 'unverified').map(part),
        approved: approved[key]?.approved === true,
      };
    });
  }
  return data;
}
