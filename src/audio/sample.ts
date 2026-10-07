/**
 * "Play a sample" in Settings ("Listen voice"): the recorded sample sentence
 * for a lessons' language (LISTEN_SAMPLES, recorded with the lessons), at
 * the device's Listen speed. Only ever from a tap: the element is unlocked
 * in the tap (Safari), then the recording plays when it has loaded. Returns
 * false when there is no recording to play here and now (offline, and not
 * on the device), so Settings can read the sample with the device's voice
 * instead.
 */
import { LISTEN_SAMPLES } from '../speech/sampleText';
import { silenceUrl } from './ListenSession';
import { loadRecording, type LoadedRecording } from './load';
import { setSpeed, type MediaLike } from './RecordedPlayer';
import { recordingLang, recordingsOf } from './recordings';
import { piecesHash } from './textHash';

/** The sample's key in each language's timings. */
export const SAMPLE_KEY = 'sample';

export class SamplePlayer {
  private media: MediaLike | null = null;
  private loaded: LoadedRecording | null = null;
  private generation = 0;
  private readonly create: () => MediaLike;

  constructor(create: () => MediaLike = () => new Audio()) {
    this.create = create;
  }

  /** True when this language has a recorded sample (it may still need downloading). */
  static has(lang: string): boolean {
    return !!recordingsOf(lang) && !!LISTEN_SAMPLES[recordingLang(lang)];
  }

  /** Plays the language's recorded sample at `rate`. Resolves false when it can't be played now. */
  async play(lang: string, rate: number): Promise<boolean> {
    const sentence = LISTEN_SAMPLES[recordingLang(lang)];
    if (!sentence || !recordingsOf(lang)) return false;
    const generation = ++this.generation;
    const media = (this.media ??= this.create());
    // From the tap, before waiting for the file (Safari).
    media.pause();
    media.src = silenceUrl();
    Promise.resolve(media.play()).catch(() => undefined);
    const recording = await loadRecording({ lang: recordingLang(lang), key: SAMPLE_KEY, hash: piecesHash([sentence]) });
    if (generation !== this.generation) {
      recording?.release();
      return true;
    }
    if (!recording) {
      media.pause();
      return false;
    }
    this.loaded?.release();
    this.loaded = recording;
    media.src = recording.url;
    setSpeed(media, rate);
    try {
      await media.play();
      return true;
    } catch (error) {
      return (error as { name?: string } | null)?.name === 'AbortError';
    }
  }

  stop(): void {
    this.generation += 1;
    this.media?.pause();
    this.loaded?.release();
    this.loaded = null;
  }
}
