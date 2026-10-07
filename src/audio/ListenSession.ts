/**
 * Listen, one part at a time: the recording when there is one, otherwise
 * the device's voice (docs/notes/recorded-audio.md).
 *
 * For each part, the recording is asked for first (./load.ts). It is played
 * when it arrives and says exactly what is on screen. The device's voice
 * reads the part instead, as Listen always did (src/speech/readAloud.ts),
 * when:
 * - the language has no recordings, or the text has changed since it was
 *   recorded;
 * - the recording isn't on the device and can't be downloaded (offline), or
 *   it fails to play;
 * - it hasn't arrived after WAIT_MS on a slow connection (it carries on
 *   downloading, so the service worker has it next time);
 * - Save data is on and it isn't on the device yet (unless there is no
 *   voice: then it is downloaded, so Listen still works).
 * With neither a recording nor a voice, it says so (onUnavailable) and
 * stops: never a button that does nothing.
 *
 * The same audio element plays every part. Safari only lets a page play
 * sound it starts from a tap, so the tap on Listen first plays a moment of
 * silence on that element (unlock), which lets it play the recordings that
 * arrive after it.
 */
import { ReadAloudPlayer, type ListenItem } from '../speech/readAloud';
import type { LoadedRecording, LoadOptions } from './load';
import { RecordedPlayer, type MediaLike } from './RecordedPlayer';
import type { RecordingRef } from './recordings';

/** How long to wait for a recording before reading with the device's voice instead (when it has one). */
export const WAIT_MS = 8000;

/** One part to read: its pieces, and its recording if the language has them. */
export interface ListenPart {
  items: readonly ListenItem[];
  recording: RecordingRef | null;
}

export interface ListenSessionOptions {
  /** The audio element (made when first needed). */
  media: () => MediaLike;
  synth: SpeechSynthesis | null;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  load: (ref: RecordingRef, options: LoadOptions) => Promise<LoadedRecording | null>;
  /** Save data: only recordings already on the device, when there is a voice to read the rest. */
  onlyStored?: () => boolean;
  /** A blob: URL of a moment of silence, for unlock(). */
  silence?: () => string;
}

export interface ListenSessionCallbacks {
  /** The piece being read now (its index), or null once stopped. */
  onItem: (index: number | null) => void;
  /** The last piece of the part has been read. */
  onFinish: () => void;
  /** Reading failed and can't go on. Listen has stopped. */
  onError: () => void;
  /** Waiting for a recording (true), or not any more (false). */
  onLoading: (loading: boolean) => void;
  /** No recording here, and no voice to read with: Listen has stopped. */
  onUnavailable: () => void;
}

type Mode = 'recorded' | 'voice' | null;

function sameRef(a: RecordingRef, b: RecordingRef): boolean {
  return a.lang === b.lang && a.key === b.key && a.hash === b.hash;
}

export class ListenSession {
  private part: ListenPart | null = null;
  private index = 0;
  private mode: Mode = null;
  private generation = 0;
  private waiting = false;
  private loaded: LoadedRecording | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private recorded: RecordedPlayer | null = null;
  private reader: ReadAloudPlayer | null = null;
  private mediaElement: MediaLike | null = null;
  private unlocked = false;
  private readonly options: ListenSessionOptions;
  private readonly callbacks: ListenSessionCallbacks;

  constructor(options: ListenSessionOptions, callbacks: ListenSessionCallbacks) {
    this.options = { ...options };
    this.callbacks = callbacks;
  }

  /** True while reading or waiting for a recording. */
  get isPlaying(): boolean {
    return this.waiting || (this.mode === 'recorded' ? !!this.recorded?.isPlaying : !!this.reader?.isPlaying);
  }

  /** The piece being read, or the one Play will start from. */
  get position(): number {
    if (this.mode === 'recorded' && this.recorded) return this.recorded.position;
    if (this.mode === 'voice' && this.reader) return this.reader.position;
    return this.index;
  }

  /** Call from the tap that starts Listen, before anything asynchronous: lets the audio element play later (Safari). */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const media = this.media();
    const silence = this.options.silence?.();
    if (!silence || media.src) return;
    media.src = silence;
    Promise.resolve(media.play())
      .then(() => {
        // Only the silence: a recording may have started on the element since.
        if (media.src === silence) media.pause();
      })
      .catch(() => undefined);
  }

  /** Reads `part` from piece `from`. */
  play(part: ListenPart, from = 0): void {
    this.halt();
    this.part = part;
    this.index = from;
    // Neither engine has this part yet: until one does, the place is `index`.
    this.mode = null;
    const ref = part.recording;
    if (!ref) {
      this.speak(from);
      return;
    }
    if (this.loaded && sameRef(this.loaded.ref, ref)) {
      this.playRecorded(this.loaded, from);
      return;
    }
    const generation = this.generation;
    const hasVoice = this.canSpeak();
    this.setWaiting(true);
    if (hasVoice) {
      // A slow connection: read with the voice rather than keep the learner waiting.
      this.timeout = setTimeout(() => {
        if (generation !== this.generation) return;
        this.halt();
        this.speak(this.index);
      }, WAIT_MS);
    }
    const onlyStored = hasVoice && (this.options.onlyStored?.() ?? false);
    void this.options
      .load(ref, { onlyStored })
      .catch(() => null)
      .then((recording) => {
        if (generation !== this.generation) {
          recording?.release();
          return;
        }
        this.halt();
        if (recording) {
          this.keep(recording);
          this.playRecorded(recording, this.index);
        } else {
          this.speak(this.index);
        }
      });
  }

  /** Stops reading but keeps the place. */
  pause(): void {
    const at = this.position;
    this.halt();
    this.index = at;
  }

  /** Reads the current piece again from its start, then carries on. */
  resume(): void {
    if (this.isPlaying || !this.part) return;
    if (this.mode === 'recorded' && this.recorded) this.recorded.resume();
    else if (this.mode === 'voice' && this.reader) this.reader.resume();
    else this.play(this.part, this.index);
  }

  /** Moves to the start of a new part without reading (paused on a new part). */
  load(part: ListenPart): void {
    this.halt();
    this.part = part;
    this.index = 0;
    this.mode = null;
  }

  stop(): void {
    this.halt();
    this.index = 0;
    this.mode = null;
    this.callbacks.onItem(null);
  }

  setRate(rate: number): void {
    this.options.rate = rate;
    this.recorded?.setRate(rate);
    this.reader?.setRate(rate);
  }

  /** A new device voice (the list loaded, or another was chosen): the recording plays on. */
  setVoice(voice: SpeechSynthesisVoice | null): void {
    if (voice === this.options.voice) return;
    this.options.voice = voice;
    if (voice && this.reader) {
      this.reader.setVoice(voice);
    } else if (this.reader) {
      // The voice went away while reading with it: stop.
      const reading = this.mode === 'voice';
      this.reader.stop();
      this.reader = null;
      if (reading) {
        this.stop();
        this.callbacks.onError();
      }
    }
  }

  /** Stops, and lets go of the recording and the audio element. */
  dispose(): void {
    this.stop();
    this.recorded?.dispose();
    this.recorded = null;
    this.loaded?.release();
    this.loaded = null;
    // Lets the browser drop the recording it was holding.
    (this.mediaElement as Partial<HTMLMediaElement> | null)?.removeAttribute?.('src');
  }

  private media(): MediaLike {
    this.mediaElement ??= this.options.media();
    return this.mediaElement;
  }

  private canSpeak(): boolean {
    return !!this.options.synth && !!this.options.voice;
  }

  private keep(recording: LoadedRecording): void {
    if (this.loaded && this.loaded !== recording) this.loaded.release();
    this.loaded = recording;
  }

  private setWaiting(waiting: boolean): void {
    if (this.waiting === waiting) return;
    this.waiting = waiting;
    this.callbacks.onLoading(waiting);
  }

  private halt(): void {
    this.generation += 1;
    if (this.timeout !== null) clearTimeout(this.timeout);
    this.timeout = null;
    this.setWaiting(false);
    this.recorded?.pause();
    this.reader?.pause();
  }

  private playRecorded(recording: LoadedRecording, from: number): void {
    this.mode = 'recorded';
    this.recorded ??= new RecordedPlayer(this.media(), this.options.rate, {
      onItem: (index) => this.callbacks.onItem(index),
      onFinish: () => this.finished(),
      // The file failed: the device's voice reads on from the same piece, if there is one.
      onError: () => {
        const at = this.recorded?.position ?? this.index;
        this.loaded?.release();
        this.loaded = null;
        this.halt();
        this.speak(at, true);
      },
    });
    this.recorded.setRate(this.options.rate);
    this.recorded.play(recording, from);
  }

  private speak(from: number, afterError = false): void {
    const { synth, voice } = this.options;
    if (!synth || !voice || !this.part) {
      this.mode = null;
      this.index = 0;
      this.callbacks.onItem(null);
      if (afterError) this.callbacks.onError();
      else this.callbacks.onUnavailable();
      return;
    }
    this.mode = 'voice';
    if (!this.reader) {
      this.reader = new ReadAloudPlayer(synth, voice, this.options.rate, {
        onItem: (index) => this.callbacks.onItem(index),
        onFinish: () => this.finished(),
        onError: () => {
          this.mode = null;
          this.callbacks.onError();
        },
      });
    }
    this.reader.play(this.part.items, from);
  }

  private finished(): void {
    this.mode = null;
    this.index = 0;
    this.callbacks.onFinish();
  }
}

let silence: string | null = null;

/** A blob: URL of a tenth of a second of silence (a WAV file made here, so nothing is fetched), made once. */
export function silenceUrl(): string {
  silence ??= makeSilence();
  return silence;
}

function makeSilence(): string {
  const rate = 8000;
  const samples = rate / 10;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (at: number, value: string) => [...value].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}
