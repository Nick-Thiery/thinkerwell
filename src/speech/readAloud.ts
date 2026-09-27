/**
 * Reading text aloud one piece at a time with speechSynthesis (Listen).
 *
 * Each piece (a heading or a sentence) is its own utterance, spoken only
 * after the one before has ended. That keeps the highlighted sentence in
 * step with the voice without relying on `boundary` events (which many
 * on-device voices never send), and keeps every utterance short (some
 * engines stop part-way through long ones).
 *
 * Pause is a cancel that remembers the piece; Play speaks that piece again
 * from its start. speechSynthesis.pause() and resume() are unreliable
 * (on Android, pause() ends the speech for good), so they aren't used.
 * Changing the speed restarts the current piece at the new rate.
 */
import type { ListeningSpeed } from '../storage';

/** Speech rates for the ListenBar's speeds: Slow is about 0.8 (docs/design-system/components/ListenBar.md). */
export const LISTEN_RATES: Record<ListeningSpeed, number> = { slow: 0.8, normal: 1 };

export interface ReadAloudCallbacks {
  /** The piece being read now (its index), or null once stopped. */
  onItem: (index: number | null) => void;
  /** The last piece has been read. */
  onFinish: () => void;
  /** The voice failed (not paused or stopped by us). The player has stopped. */
  onError?: () => void;
}

export class ReadAloudPlayer {
  private items: readonly string[] = [];
  private index = 0;
  private playing = false;
  /** Bumped on every play, pause and stop, so events from an older utterance are ignored. */
  private generation = 0;
  /** Held so the browser can't garbage-collect the utterance (and drop its events) mid-sentence. */
  private current: SpeechSynthesisUtterance | null = null;
  private readonly synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice;
  private rate: number;
  private readonly callbacks: ReadAloudCallbacks;

  constructor(synth: SpeechSynthesis, voice: SpeechSynthesisVoice, rate: number, callbacks: ReadAloudCallbacks) {
    this.synth = synth;
    this.voice = voice;
    this.rate = rate;
    this.callbacks = callbacks;
  }

  /** True while speaking (not paused or stopped). */
  get isPlaying(): boolean {
    return this.playing;
  }

  /** The piece being read, or the one Play will start from. */
  get position(): number {
    return this.index;
  }

  /** Reads `items` from `from` to the end. */
  play(items: readonly string[], from = 0): void {
    this.items = items;
    this.speakFrom(from);
  }

  /** Stops speaking but keeps the place. */
  pause(): void {
    this.halt();
  }

  /** Speaks the current piece again from its start, then carries on. */
  resume(): void {
    if (!this.playing) this.speakFrom(this.index);
  }

  /** Moves to the start of new items without speaking (paused on a new part). */
  load(items: readonly string[]): void {
    this.halt();
    this.items = items;
    this.index = 0;
  }

  stop(): void {
    this.halt();
    this.index = 0;
    this.callbacks.onItem(null);
  }

  setRate(rate: number): void {
    if (rate === this.rate) return;
    this.rate = rate;
    if (this.playing) this.speakFrom(this.index);
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    if (voice === this.voice) return;
    this.voice = voice;
    if (this.playing) this.speakFrom(this.index);
  }

  private halt(): void {
    this.playing = false;
    this.generation += 1;
    this.current = null;
    this.synth.cancel();
  }

  private speakFrom(index: number): void {
    this.halt();
    this.playing = true;
    // A pause() left over from another page would hold every new utterance in the queue.
    if (this.synth.paused) this.synth.resume();
    this.speakItem(index, this.generation);
  }

  private speakItem(start: number, generation: number): void {
    if (generation !== this.generation) return;
    let index = start;
    while (index < this.items.length && !this.items[index]!.trim()) index += 1;
    if (index >= this.items.length) {
      this.playing = false;
      this.current = null;
      this.index = 0;
      this.callbacks.onFinish();
      return;
    }
    this.index = index;
    const utterance = new SpeechSynthesisUtterance(this.items[index]);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = this.rate;
    utterance.onend = () => {
      if (generation !== this.generation || this.current !== utterance) return;
      this.speakItem(index + 1, generation);
    };
    utterance.onerror = () => {
      if (generation !== this.generation || this.current !== utterance) return;
      // Something other than our own pause or stop ended it: stop quietly.
      this.halt();
      this.index = 0;
      this.callbacks.onItem(null);
      this.callbacks.onError?.();
    };
    this.current = utterance;
    this.callbacks.onItem(index);
    this.synth.speak(utterance);
  }
}
