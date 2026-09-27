/**
 * The one place the lesson player talks to YouTube. Nothing here runs until
 * the learner taps "Watch the video": there is no preconnect, no thumbnail
 * and no prefetch, and the service worker never caches any of it
 * (CLAUDE.md: privacy, bad internet).
 */

/** The only host the player is embedded from. */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

/**
 * How long the player gets to load after the tap before Watch switches to
 * the written version (CLAUDE.md: "If the player hasn't loaded after 20
 * seconds ... show the written version").
 */
export const PLAYER_TIMEOUT_MS = 20_000;

/**
 * What the embedded frame may use. No "autoplay": the learner starts the
 * video with the player's own play button (CLAUDE.md: never autoplay).
 */
export const PLAYER_ALLOW = 'encrypted-media; picture-in-picture; fullscreen';

/**
 * index.html sets <meta name="referrer" content="no-referrer"> for the whole
 * site, but YouTube's embedded player refuses to play without a referrer
 * (its "Error 153"). This per-frame policy overrides the meta for the
 * player's own request only, and sends just the origin cross-site.
 */
export const PLAYER_REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * The embed URL for a lesson's video. No autoplay parameter.
 * - rel=0: related videos only from the same channel at the end.
 * - playsinline=1: plays in the page on iPhones and iPads, not fullscreen.
 * - modestbranding=1: less YouTube branding (ignored by newer players; harmless).
 * - cc_load_policy=1: captions on by default, for learners of English.
 * - enablejsapi=1 and origin: let the player tell this page, by
 *   postMessage, that it really is ready (see isPlayerMessage). No YouTube
 *   script is loaded on the page for this. `origin` is this site's own
 *   origin, which the frame's referrer already sends.
 */
export function youtubeEmbedUrl(youtubeId: string, origin?: string): string {
  const params = new URLSearchParams({ rel: '0', playsinline: '1', modestbranding: '1', cc_load_policy: '1' });
  if (origin) {
    params.set('enablejsapi', '1');
    params.set('origin', origin);
  }
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

/**
 * The frame's load event is not proof that the player works: a cross-origin
 * frame also fires it for the browser's own network-error page (connection
 * refused, DNS failure, a school filter) and for any error page a proxy or
 * captive portal sends back. So the page asks the player to talk, the way
 * YouTube's own iframe API does, by posting this "listening" message into
 * the frame until the player answers. The message carries no data about the
 * learner.
 */
export const PLAYER_LISTENING_MESSAGE = JSON.stringify({ event: 'listening', id: 1, channel: 'widget' });

/** How often the page repeats PLAYER_LISTENING_MESSAGE until the player answers. */
export const PLAYER_LISTEN_INTERVAL_MS = 250;

/** What a message from the player means for the lesson: it works, it can't play this video, or neither. */
export type PlayerSignal = 'ready' | 'error' | null;

/** Player events that mean the real YouTube player is running in the frame. */
const READY_EVENTS = new Set(['onReady', 'initialDelivery', 'infoDelivery']);

/**
 * Reads a `message` event: only one sent by the youtube-nocookie player in
 * this page's own frame counts. 'error' is the player's onError (the video
 * was removed, is private or can't be embedded).
 */
export function playerSignal(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, frame: Window | null | undefined): PlayerSignal {
  if (event.origin !== YOUTUBE_EMBED_ORIGIN || !frame || event.source !== frame) return null;
  let data: unknown = event.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const name = (data as { event?: unknown }).event;
  if (name === 'onError') return 'error';
  return typeof name === 'string' && READY_EVENTS.has(name) ? 'ready' : null;
}
