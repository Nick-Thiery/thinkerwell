/**
 * What the reviewers' page shows (/review/videos, ./VideoReviewPage.tsx):
 * for each translated language and lesson, the local-language Watch video
 * the pre-screen recommends, with its drafts, and the other videos that may
 * fit. Made at build time from docs/notes/local-videos/<lang>.json by
 * tools/videos/reviewData.ts (vite.config.ts serves it as a virtual module
 * that only this page imports). Nothing here reaches a learner: a video is
 * shown in a lesson only once a person approves it (npm run videos:apply).
 */
/** A video, or the part of it that fits the lesson. */
export interface ReviewPart {
  youtubeId: string;
  title: string;
  channel: string;
  channelUrl?: string;
  startSeconds?: number;
  endSeconds?: number;
}

/** The video recommended for a lesson, with the drafts a lesson would show. */
export interface ReviewRecommendation extends ReviewPart {
  /** The part's length (or the whole video's), in seconds; null when unknown. */
  durationSeconds: number | null;
  why: string;
  beforeQuestion: string;
  afterQuestion: string;
  /** Which questions were written for this video ('beforeQuestion', 'afterQuestion'); the others are the lesson's own. */
  questionsChanged: string[];
  summary: string;
  keyPoints: string[];
  contentNote: string | null;
  /** YouTube has made an AI-dubbed English soundtrack it may play instead of the original. */
  autoDubbed: boolean;
  /** It covers only part of the lesson. */
  weakFit: boolean;
  /** The written version was drafted from the video's words (its captions), not only its description. */
  summaryFromVideo: boolean;
}

export interface ReviewLesson {
  /** The lesson's file name, "L05". */
  key: string;
  /** The recommended video, or null when none was good enough. */
  recommended: ReviewRecommendation | null;
  /** Other videos the pre-screen found that also fit. */
  alsoSuitable: ReviewPart[];
  /** Videos nobody could check (no captions): a person must watch them. */
  notChecked: ReviewPart[];
  /** A person already approved a video for this lesson (content/<lang>/videos.json). */
  approved: boolean;
}

/** By language code ("id", "ms"), every lesson in order. */
export type VideoReviewData = Record<string, ReviewLesson[]>;

export type ReviewDecision = 'use' | 'change' | 'no';

/** A reviewer's answer for one lesson. */
export interface ReviewAnswer {
  decision?: ReviewDecision;
  comment?: string;
}

/** What a reviewer has said, kept on this device only (settings.videoReview, the same shape in src/storage/types.ts). */
export interface VideoReviewNotes {
  reviewer?: string;
  /** By "<lang>/<lesson>", "id/L05". */
  answers: Record<string, ReviewAnswer>;
}
