import type { MessageKey } from '../../i18n';

/**
 * Thinkerwell's own videos about Thinkerwell (docs/notes/site-videos.md),
 * shown on About, For educators, For organisations and the setup checklist. They are files on
 * this site (public/video/), not YouTube embeds, so nothing loads from
 * another server. Each file name carries a version: the files are cached
 * for a year (vercel.json), so a changed video gets a new name.
 *
 * The words of each video are in the messages (`siteVideo.<id>`), so the
 * written version ("Read instead") is in the reader's language even though
 * the video is in English.
 */
export interface SiteVideo {
  /** The MP4 (H.264 and AAC, 1280×720, "fast start"). */
  src: string;
  /** English captions (WebVTT), made from the narration's word timings. */
  captions: string;
  /**
   * Subtitles in other languages (WebVTT), by language code: the written
   * version's words on the English lines' timings. The Indonesian is
   * AI-drafted and flagged for the native reviewers like the rest of the
   * interface (docs/translation/README.md).
   */
  subtitles: Readonly<Record<string, string>>;
  /** Length in seconds, shown on the poster. */
  seconds: number;
  /** About how many megabytes it downloads, rounded up, said under the title. */
  megabytes: number;
  title: MessageKey;
  /** One line on what it shows, under the title. */
  blurb: MessageKey;
  /** What the narration says, a paragraph per message: the written version. */
  words: readonly MessageKey[];
  /** The sources of any figures it quotes, under the written version. */
  sources?: MessageKey;
}

export type SiteVideoId = 'explore' | 'session' | 'setup';

export const SITE_VIDEOS: Record<SiteVideoId, SiteVideo> = {
  // "Explore your world" (v3): what Thinkerwell is and why. On About, under the mission.
  explore: {
    src: '/video/explore-your-world-v3.mp4',
    captions: '/video/explore-your-world-v3.en.vtt',
    subtitles: { id: '/video/explore-your-world-v3.id.vtt' },
    seconds: 113,
    megabytes: 8,
    title: 'siteVideo.explore.title',
    blurb: 'siteVideo.explore.blurb',
    words: [
      'siteVideo.explore.p1',
      'siteVideo.explore.p2',
      'siteVideo.explore.p3',
      'siteVideo.explore.p4',
      'siteVideo.explore.p5',
      'siteVideo.explore.p6',
    ],
    sources: 'siteVideo.explore.sources',
  },
  // "Run a session": a session from start to finish. On For educators and For organisations.
  session: {
    src: '/video/run-a-session-v1.mp4',
    captions: '/video/run-a-session-v1.en.vtt',
    subtitles: { id: '/video/run-a-session-v1.id.vtt' },
    seconds: 69,
    megabytes: 5,
    title: 'siteVideo.session.title',
    blurb: 'siteVideo.session.blurb',
    words: [
      'siteVideo.session.p1',
      'siteVideo.session.p2',
      'siteVideo.session.p3',
      'siteVideo.session.p4',
      'siteVideo.session.p5',
      'siteVideo.session.p6',
    ],
  },
  // "Set up a device": the checklist, step by step. On "Set up this device".
  setup: {
    src: '/video/set-up-a-device-v1.mp4',
    captions: '/video/set-up-a-device-v1.en.vtt',
    subtitles: { id: '/video/set-up-a-device-v1.id.vtt' },
    seconds: 79,
    megabytes: 5,
    title: 'siteVideo.setup.title',
    blurb: 'siteVideo.setup.blurb',
    words: [
      'siteVideo.setup.p1',
      'siteVideo.setup.p2',
      'siteVideo.setup.p3',
      'siteVideo.setup.p4',
      'siteVideo.setup.p5',
      'siteVideo.setup.p6',
    ],
  },
};
