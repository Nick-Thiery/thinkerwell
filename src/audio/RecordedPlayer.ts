/**
 * Playing one section's recording with an audio element, marking the piece
 * being read from the element's own clock (docs/notes/recorded-audio.md).
 *
 * - The piece is looked up from `currentTime` in the section's timings
 *   (./timings.ts), on every `timeupdate` and ten times a second while
 *   playing. `currentTime` is the recording's own time, so the highlight
 *   stays right at any speed, and changing the speed mid-sentence just
 *   carries on at the new speed.
 * - Slow and Normal are `playbackRate` 0.8 and 1, with the pitch kept
 *   (`preservesPitch`, and the older webkit and moz names), so a slower
 *   voice sounds like the same person speaking slowly, not a lower voice.
 * - Pause, then Play, starts the piece again from its beginning, as Listen
 *   always has with the device's voice: a learner who stopped in the middle
 *   of a sentence hears it whole.
 */
import { firstPieceFrom, pieceAt, startOf, type PieceTime } from './timings';
import type { LoadedRecording } from './load';

/** The parts of an HTMLAudioElement used here (a fake in tests). */
export interface MediaLike {
  src: string;
  currentTime: number;
  playbackRate: number;
  defaultPlaybackRate: number;
  readyState: number;
  paused: boolean;
  preservesPitch?: boolean;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface RecordedCallbacks {
  /** The piece being read now (its index), or null once stopped. */
  onItem: (index: number | null) => void;
  /** The recording has played to its end. */
  onFinish: () => void;
  /** The recording can't play (a broken file, or the browser refused). The player has stopped. */
  onError: () => void;
}

/** How often the highlight is checked while playing, besides the element's own timeupdate. */
export const TRACK_MS = 100;

/** Sets the speed with the pitch kept, under every name browsers have used for it. */
export function setSpeed(media: MediaLike, rate: number): void {
  const pitch = media as MediaLike & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
  pitch.preservesPitch = true;
  pitch.webkitPreservesPitch = true;
  pitch.mozPreservesPitch = true;
  media.defaultPlaybackRate = rate;
  media.playbackRate = rate;
}

export class RecordedPlayer {
  private recording: LoadedRecording | null = null;
  private index = 0;
  private reported: number | null = null;
  private playing = false;
  /** Bumped on every play, pause and stop, so a late event or promise from before changes nothing. */
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly media: MediaLike;
  private rate: number;
  private readonly callbacks: RecordedCallbacks;
  private readonly listeners: Array<[string, () => void]>;

  constructor(media: MediaLike, rate: number, callbacks: RecordedCallbacks) {
    this.media = media;
    this.rate = rate;
    this.callbacks = callbacks;
    this.listeners = [
      ['timeupdate', () => this.track()],
      ['seeked', () => this.track()],
      ['ended', () => this.ended()],
      ['error', () => this.failed()],
    ];
    for (const [type, listener] of this.listeners) media.addEventListener(type, listener);
  }

  /** True while playing (not paused or stopped). */
  get isPlaying(): boolean {
    return this.playing;
  }

  /** The piece being read, or the one Play will start from. */
  get position(): number {
    return this.index;
  }

  /** Plays `recording` from piece `from`. */
  play(recording: LoadedRecording, from = 0): void {
    this.recording = recording;
    this.start(from);
  }

  /** Stops playing but keeps the place. */
  pause(): void {
    this.halt();
  }

  /** Plays the current piece again from its start, then carries on. */
  resume(): void {
    if (!this.playing && this.recording) this.start(this.index);
  }

  stop(): void {
    this.halt();
    this.index = 0;
    this.reported = null;
    this.callbacks.onItem(null);
  }

  setRate(rate: number): void {
    this.rate = rate;
    if (this.recording) setSpeed(this.media, rate);
  }

  /** Stops, and lets go of the element. */
  dispose(): void {
    this.halt();
    for (const [type, listener] of this.listeners) this.media.removeEventListener(type, listener);
  }

  private get times(): readonly PieceTime[] {
    return this.recording?.times ?? [];
  }

  private halt(): void {
    this.generation += 1;
    this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (!this.media.paused) this.media.pause();
  }

  private start(from: number): void {
    this.halt();
    const recording = this.recording!;
    const piece = firstPieceFrom(this.times, from);
    const at = startOf(this.times, from);
    if (piece === null || at === null) {
      this.finish();
      return;
    }
    const generation = this.generation;
    this.playing = true;
    this.index = piece;
    this.report(piece);
    if (this.media.src !== recording.url) this.media.src = recording.url;
    setSpeed(this.media, this.rate);
    const go = () => {
      this.media.removeEventListener('loadedmetadata', go);
      if (generation !== this.generation) return;
      this.media.currentTime = at;
      Promise.resolve(this.media.play()).catch((error: unknown) => {
        // A newer play, pause or src change interrupts this one: that is ours, not a failure.
        if (generation === this.generation && (error as { name?: string } | null)?.name !== 'AbortError') this.failed();
      });
      this.timer = setInterval(() => this.track(), TRACK_MS);
    };
    // HAVE_METADATA: seeking works once the element knows the recording's length.
    if (this.media.readyState >= 1) go();
    else this.media.addEventListener('loadedmetadata', go);
  }

  private report(index: number | null): void {
    if (index === this.reported) return;
    this.reported = index;
    this.callbacks.onItem(index);
  }

  private track(): void {
    if (!this.playing) return;
    const index = pieceAt(this.times, this.media.currentTime);
    if (index === null) return;
    this.index = index;
    this.report(index);
  }

  private ended(): void {
    if (!this.playing) return;
    this.finish();
  }

  private finish(): void {
    this.halt();
    this.index = 0;
    this.reported = null;
    this.callbacks.onFinish();
  }

  private failed(): void {
    if (!this.playing) return;
    this.halt();
    this.reported = null;
    this.callbacks.onError();
  }
}
