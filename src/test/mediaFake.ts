/**
 * A fake audio element for Vitest (jsdom can't play audio): it records
 * what Listen asks of it, and a test moves its clock (`advanceTo`) and ends
 * or breaks it (`end`, `fail`).
 */
import type { MediaLike } from '../audio/RecordedPlayer';

export class FakeMedia implements MediaLike {
  src = '';
  currentTime = 0;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  readyState = 4;
  paused = true;
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  /** Every src it was asked to play, in order. */
  played: string[] = [];
  /** What play() does: resolve (default) or reject with this error's name. */
  playFails: string | null = null;
  private listeners = new Map<string, Set<() => void>>();

  play(): Promise<void> {
    if (this.playFails) {
      const name = this.playFails;
      return Promise.reject(Object.assign(new Error(name), { name }));
    }
    this.paused = false;
    this.played.push(this.src);
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }

  /** Moves the clock to `seconds`, as playing does, and says so (timeupdate). */
  advanceTo(seconds: number): void {
    this.currentTime = seconds;
    this.emit('timeupdate');
  }

  end(): void {
    this.paused = true;
    this.emit('ended');
  }

  fail(): void {
    this.paused = true;
    this.emit('error');
  }
}
