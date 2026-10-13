/**
 * Sends the queue to this site's own server, POST /api/events, in small
 * batches, when the device is online. Never blocks anything: it runs on
 * timers and promises, and every failure is caught here.
 *
 * What the answers mean (api/_lib/events.ts):
 * - 200 or 202: stored; those events leave the queue.
 * - 503, 404, 405: the server isn't set up for measurement (no database, no
 *   endpoint). The app stops quietly for PAUSE_NOT_CONFIGURED_MS, remembered
 *   across page loads, and keeps what is queued (up to MAX_QUEUED).
 * - 400, 403, 422 and other 4xx: the server will never take these events
 *   (a version mismatch, an organisation it doesn't know). They are dropped
 *   so they can't block the queue, and the app waits PAUSE_REFUSED_MS before
 *   trying again.
 * - 413: the batch was too big; send fewer. 429 and 5xx, or no connection:
 *   try again later, backing off from 15 seconds to 15 minutes, with a
 *   little randomness so a classroom of tablets doesn't all knock at once.
 */
import { BATCH_VERSION, MAX_BATCH_EVENTS, MAX_BODY_BYTES } from './events';
import type { Queue } from './queue';

export const EVENTS_ENDPOINT = '/api/events';

/** Wait this long after the first event of a burst before sending, so several go together. */
export const SEND_DELAY_MS = 5_000;
export const BACKOFF_FIRST_MS = 15_000;
export const BACKOFF_MAX_MS = 15 * 60_000;
export const PAUSE_NOT_CONFIGURED_MS = 6 * 60 * 60_000;
export const PAUSE_REFUSED_MS = 60 * 60_000;

export interface SenderOptions {
  queue: () => Promise<Queue>;
  fetchFn?: typeof fetch;
  now?: () => number;
  online?: () => boolean;
  random?: () => number;
}

export class Sender {
  private readonly getQueue: () => Promise<Queue>;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly online: () => boolean;
  private readonly random: () => number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private again = false;
  private stopped = false;
  private failures = 0;
  private batchSize = MAX_BATCH_EVENTS;

  constructor(options: SenderOptions) {
    this.getQueue = options.queue;
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.now = options.now ?? (() => Date.now());
    this.online = options.online ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false);
    this.random = options.random ?? Math.random;
  }

  /** Something is waiting: send soon (once per burst). */
  poke(delay = SEND_DELAY_MS): void {
    if (this.stopped || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, delay);
  }

  /** Tries now, for when the page is being hidden. Resolves when this try is over. */
  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.run();
  }

  /** Stops for good: no more timers, no more requests (sharing was turned off). */
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async run(): Promise<void> {
    if (this.stopped) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    try {
      do {
        this.again = false;
        await this.drain();
      } while (this.again && !this.stopped);
    } catch {
      // Never let a failure here reach the page: try again later.
      this.backOff();
    } finally {
      this.running = false;
    }
  }

  private backOff(retryAfterMs?: number): void {
    this.failures += 1;
    const exponential = Math.min(BACKOFF_MAX_MS, BACKOFF_FIRST_MS * 2 ** (this.failures - 1));
    const jittered = exponential * (0.75 + this.random() * 0.5);
    this.poke(Math.max(retryAfterMs ?? 0, jittered));
  }

  private async pause(ms: number): Promise<void> {
    const queue = await this.getQueue();
    await queue.setMeta('pausedUntil', this.now() + ms);
    this.poke(ms);
  }

  private async drain(): Promise<void> {
    const queue = await this.getQueue();
    for (;;) {
      if (this.stopped || !this.online()) return;
      const pausedUntil = await queue.getMeta<number>('pausedUntil');
      if (typeof pausedUntil === 'number' && this.now() < pausedUntil) {
        this.poke(pausedUntil - this.now());
        return;
      }
      const batch = await queue.peek(this.batchSize);
      if (batch.length === 0) {
        this.failures = 0;
        this.batchSize = MAX_BATCH_EVENTS;
        return;
      }
      let events = batch;
      let body = JSON.stringify({ v: BATCH_VERSION, events: events.map((item) => item.event) });
      // A request over the server's limit would be refused: send fewer.
      while (body.length > MAX_BODY_BYTES && events.length > 1) {
        events = events.slice(0, Math.ceil(events.length / 2));
        body = JSON.stringify({ v: BATCH_VERSION, events: events.map((item) => item.event) });
      }
      let response: Response;
      try {
        response = await this.fetchFn(EVENTS_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
          keepalive: true,
        });
      } catch {
        this.backOff();
        return;
      }
      const status = response.status;
      if (status === 200 || status === 202) {
        await queue.remove(events.map((item) => item.key));
        this.failures = 0;
        continue;
      }
      if (status === 503 || status === 404 || status === 405) {
        await this.pause(PAUSE_NOT_CONFIGURED_MS);
        return;
      }
      if (status === 413) {
        if (events.length <= 1) await queue.remove(events.map((item) => item.key));
        this.batchSize = Math.max(1, Math.floor(events.length / 2));
        continue;
      }
      if (status === 429 || status >= 500) {
        const seconds = Number(response.headers.get('retry-after'));
        this.backOff(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) * 1000 : undefined);
        return;
      }
      // Any other answer is a refusal that retrying won't change.
      await queue.remove(events.map((item) => item.key));
      await this.pause(PAUSE_REFUSED_MS);
      return;
    }
  }
}
