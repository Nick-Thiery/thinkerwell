/**
 * Pilot measurement, the part that does the work (docs/notes/pilot-measurement.md).
 * Loaded with import() by ./track.ts only once a device is set to share
 * results (an organisation code and "Share pilot results" in Settings), so
 * a first visit, and every device that never shares, downloads none of it.
 *
 * It keeps a session going for the learner who has a pilot code, writes each
 * event to the queue (./queue.ts) the moment it happens, and has the sender
 * (./sender.ts) post the queue to this site's own /api/events when the
 * device is online. Heartbeats come every 30 seconds while the page is
 * visible and there was input in the last 60 seconds, so a tablet left open
 * counts no minutes.
 *
 * Everything is checked with checkEvent() (./events.ts) before it is queued:
 * the same strict check the server runs.
 */
import { checkEvent, type EventDetails, type EventType, type MeasurementEvent, type Stage } from './events';
import type { Gate } from './gate';
import { openQueue, deleteQueueDatabase, type Queue } from './queue';
import { Sender, type SenderOptions } from './sender';
import { APP_VERSION } from './appVersion';

export const HEARTBEAT_EVERY_MS = 30_000;
/** A heartbeat counts only if there was input this recently. */
export const ACTIVE_WITHIN_MS = 60_000;
/** Writing counts are held this long after the last keystroke's save, so typing sends one event, not dozens. */
export const WRITING_QUIET_MS = 10_000;
/** A tab hidden for longer than this starts a new session when it comes back. */
export const NEW_SESSION_AFTER_MS = 30 * 60_000;

const INPUT_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

function uuid(): string {
  return crypto.randomUUID();
}

export interface CollectorOptions {
  queue?: () => Promise<Queue>;
  sender?: Pick<SenderOptions, 'fetchFn' | 'online' | 'random'>;
  now?: () => number;
}

interface Session {
  id: string;
  gate: Gate;
}

interface LessonContext {
  lessonId: string;
  stage: Stage | null;
}

export class Collector {
  private readonly now: () => number;
  private readonly openQueue: () => Promise<Queue>;
  private readonly senderOptions: Pick<SenderOptions, 'fetchFn' | 'online' | 'random'>;
  private queuePromise: Promise<Queue> | null = null;
  private senderInstance: Sender | null = null;
  /** Everything that touches the queue goes through this chain, so events stay in order. */
  private chain: Promise<unknown> = Promise.resolve();

  /** The organisation this device shares with, or null: sharing is off. */
  private org: string | null = null;
  private gate: Gate | null = null;
  private session: Session | null = null;
  private context: LessonContext | null = null;
  private deviceId: string | null = null;

  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastInput = 0;
  private hiddenAt: number | null = null;
  private listening = false;
  private writing = new Map<string, EventDetails>();
  private writingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: CollectorOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.openQueue = options.queue ?? openQueue;
    this.senderOptions = options.sender ?? {};
  }

  private queue(): Promise<Queue> {
    if (!this.queuePromise) {
      const opening = this.openQueue().then((queue) => {
        // Deleted from outside (Settings' "Delete all data"): open it again the next time it is needed.
        queue.onClosed(() => {
          if (this.queuePromise !== opening) return;
          this.queuePromise = null;
          this.deviceId = null;
        });
        return queue;
      });
      this.queuePromise = opening;
    }
    return this.queuePromise;
  }

  private sender(): Sender {
    return (this.senderInstance ??= new Sender({ queue: () => this.queue(), now: this.now, ...this.senderOptions }));
  }

  private enqueueTask<T>(task: () => Promise<T>): Promise<T | undefined> {
    const next = this.chain.then(task, task);
    this.chain = next.catch(() => undefined);
    return next.catch(() => undefined);
  }

  /**
   * Called whenever the sharing setting, the organisation code or the
   * learner using the device changes. `org` null means sharing is off:
   * what was waiting is deleted, and nothing more is kept or sent.
   */
  applyGate(org: string | null, gate: Gate | null): Promise<void> {
    const wasOn = this.org !== null;
    this.org = org;
    const sameLearner = this.gate && gate && this.gate.org === gate.org && this.gate.pilotCode === gate.pilotCode;
    if (!org) {
      this.gate = null;
      this.stopSession(false);
      this.senderInstance?.stop();
      this.senderInstance = null;
      return wasOn ? this.purge() : Promise.resolve();
    }
    // The device is set to share: send what is waiting from earlier visits.
    this.sender().poke(1_000);
    if (sameLearner) return Promise.resolve();
    this.flushWriting();
    this.stopSession(true);
    this.gate = gate;
    if (gate) this.startSession(gate);
    return Promise.resolve();
  }

  /** Records that something happened. Does nothing unless this learner is the one measured right now. */
  record(gate: Gate, type: EventType, details: EventDetails = {}): void {
    if (!this.org || !this.gate || this.gate.org !== gate.org || this.gate.pilotCode !== gate.pilotCode) return;
    if (!this.session) this.startSession(this.gate);
    const session = this.session;
    if (!session) return;
    if (type === 'writing_saved') {
      // Keep only the latest count for this lesson and stage; it goes in the queue after a quiet moment.
      this.writing.set(`${details.lessonId ?? ''}/${details.stage ?? ''}`, details);
      if (this.writingTimer) clearTimeout(this.writingTimer);
      this.writingTimer = setTimeout(() => this.flushWriting(), WRITING_QUIET_MS);
      return;
    }
    if (type === 'lesson_open') this.context = { lessonId: details.lessonId ?? '', stage: null };
    if (type === 'stage_enter') {
      this.flushWriting();
      this.context = { lessonId: details.lessonId ?? '', stage: details.stage ?? null };
    }
    this.emit(session, type, details);
  }

  /** The learner left the lesson pages: heartbeats stop naming a lesson. */
  leaveLesson(): void {
    this.flushWriting();
    this.context = null;
  }

  private flushWriting(): void {
    if (this.writingTimer) clearTimeout(this.writingTimer);
    this.writingTimer = null;
    const session = this.session;
    const pending = [...this.writing.values()];
    this.writing.clear();
    if (!session) return;
    for (const details of pending) this.emit(session, 'writing_saved', details);
  }

  private emit(session: Session, type: EventType, details: EventDetails): void {
    void this.enqueueTask(async () => {
      // Turned off since: nothing more is kept. (A session that just ended still writes its end.)
      if (!this.org) return;
      const queue = await this.queue();
      const deviceId = await this.ensureDeviceId(queue);
      const event: MeasurementEvent = {
        id: uuid(),
        org: session.gate.org,
        pilotCode: session.gate.pilotCode,
        deviceId,
        sessionId: session.id,
        type,
        value: { ...details.value },
        ts: this.now(),
        appVersion: APP_VERSION,
      };
      if (details.lessonId !== undefined) event.lessonId = details.lessonId;
      if (details.stage !== undefined) event.stage = details.stage;
      const checked = checkEvent(event);
      if (!checked.ok) {
        if (import.meta.env.DEV) console.warn(`Measurement dropped an event: ${checked.error}`);
        return;
      }
      await queue.add(checked.value);
      this.sender().poke();
    });
  }

  private async ensureDeviceId(queue: Queue): Promise<string> {
    if (this.deviceId) return this.deviceId;
    const stored = await queue.getMeta<string>('deviceId');
    if (typeof stored === 'string') {
      this.deviceId = stored;
      return stored;
    }
    const id = uuid();
    await queue.setMeta('deviceId', id);
    this.deviceId = id;
    return id;
  }

  private startSession(gate: Gate): void {
    this.session = { id: uuid(), gate };
    this.lastInput = this.now();
    this.hiddenAt = null;
    this.listen(true);
    this.heartbeat = setInterval(() => this.tick(), HEARTBEAT_EVERY_MS);
    this.emit(this.session, 'session_start', {});
  }

  /** Ends the session; `send` says it counts (a learner left), else it is just stopped (sharing turned off). */
  private stopSession(send: boolean): void {
    const session = this.session;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.listen(false);
    if (this.writingTimer) clearTimeout(this.writingTimer);
    this.writingTimer = null;
    if (!session) {
      this.writing.clear();
      return;
    }
    if (send) {
      this.flushWriting();
      this.emit(session, 'session_end', {});
    } else {
      this.writing.clear();
    }
    this.session = null;
    this.context = null;
  }

  private tick(): void {
    const session = this.session;
    if (!session || typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    if (this.now() - this.lastInput > ACTIVE_WITHIN_MS) return;
    const details: EventDetails = {};
    if (this.context?.lessonId) {
      details.lessonId = this.context.lessonId;
      if (this.context.stage) details.stage = this.context.stage;
    }
    this.emit(session, 'heartbeat', details);
  }

  private readonly onInput = (): void => {
    this.lastInput = this.now();
  };

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = this.now();
      this.flushWriting();
      void this.enqueueTask(() => this.sender().flushNow());
      return;
    }
    const away = this.hiddenAt === null ? 0 : this.now() - this.hiddenAt;
    this.hiddenAt = null;
    this.lastInput = this.now();
    if (away > NEW_SESSION_AFTER_MS && this.gate) {
      const gate = this.gate;
      this.stopSession(true);
      this.startSession(gate);
    }
  };

  private readonly onPageHide = (): void => {
    this.flushWriting();
    const gate = this.gate;
    this.stopSession(true);
    // Back from the browser's page cache: a new stretch of use.
    const restart = (event: PageTransitionEvent): void => {
      if (event.persisted && gate && this.org && !this.session) this.startSession(gate);
    };
    window.addEventListener('pageshow', restart, { once: true });
    void this.enqueueTask(() => this.sender().flushNow());
  };

  private readonly onOnline = (): void => {
    this.sender().poke(1_000);
  };

  private listen(on: boolean): void {
    if (on === this.listening || typeof window === 'undefined') return;
    this.listening = on;
    const method = on ? 'addEventListener' : 'removeEventListener';
    for (const name of INPUT_EVENTS) window[method](name, this.onInput, { passive: true, capture: true });
    document[method]('visibilitychange', this.onVisibility);
    window[method]('pagehide', this.onPageHide);
    window[method]('online', this.onOnline);
  }

  /** Deletes every waiting event and the device id, and closes the database. */
  purge(): Promise<void> {
    this.deviceId = null;
    this.writing.clear();
    return (
      this.enqueueTask(async () => {
        const queue = await this.queue();
        await queue.clear();
      }) as Promise<unknown>
    ).then(() => undefined);
  }

  /** A learner was removed from the device: their waiting results go too. */
  forgetPilotCode(code: string): Promise<void> {
    return (
      this.enqueueTask(async () => {
        const queue = await this.queue();
        await queue.removeWhere((event) => event.pilotCode === code);
      }) as Promise<unknown>
    ).then(() => undefined);
  }

  /** Deletes the whole database from the device (Settings: "Delete unsent results"). */
  async deleteEverything(): Promise<void> {
    await this.purge();
    await this.enqueueTask(async () => {
      if (this.queuePromise) (await this.queuePromise).close();
      this.queuePromise = null;
      await deleteQueueDatabase();
    });
  }

  /** What Settings shows: how many results wait, and whether sending is paused. */
  async status(): Promise<{ pending: number; pausedUntil: number | null }> {
    const queue = await this.queue();
    const pausedUntil = await queue.getMeta<number>('pausedUntil');
    return { pending: await queue.count(), pausedUntil: typeof pausedUntil === 'number' && pausedUntil > this.now() ? pausedUntil : null };
  }

  /** Tries to send now. For tests, and for the Settings button, if it ever gets one. */
  sendNow(): Promise<void> {
    return this.sender().flushNow();
  }
}

/** The one collector the app uses. */
const collector = new Collector();

export const applyGate = (org: string | null, gate: Gate | null): Promise<void> => collector.applyGate(org, gate);
export const record = (gate: Gate, type: EventType, details?: EventDetails): void => collector.record(gate, type, details);
export const leaveLesson = (): void => collector.leaveLesson();
export const purge = (): Promise<void> => collector.purge();
export const forgetPilotCode = (code: string): Promise<void> => collector.forgetPilotCode(code);
export const status = (): Promise<{ pending: number; pausedUntil: number | null }> => collector.status();
export const deleteEverything = (): Promise<void> => collector.deleteEverything();
