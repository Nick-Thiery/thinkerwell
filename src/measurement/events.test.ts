import { describe, expect, it } from 'vitest';
import { checkBatch, checkEvent, EVENT_SPECS, EVENT_TYPES, MAX_BATCH_EVENTS, type MeasurementEvent } from './events';

const UUID_A = '3b9f1c1e-7a6d-4f0e-9a52-0d1f6e8c2a11';
const UUID_B = '0a4d8f52-1c3b-4e7a-8b6d-9f2e5c7a1b30';
const UUID_C = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
const TS = 1_790_000_000_000;

function event(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: UUID_A,
    org: 'help-jakarta',
    pilotCode: 'HLP-01',
    deviceId: UUID_B,
    sessionId: UUID_C,
    type: 'lesson_open',
    lessonId: 'towns-near-rivers',
    value: {},
    ts: TS,
    appVersion: '0.1.0',
    ...over,
  };
}

/** A valid example of every kind of event, so a new kind can't be added without one. */
const EXAMPLES: Record<string, Record<string, unknown>> = {
  session_start: event({ type: 'session_start', lessonId: undefined }),
  session_end: event({ type: 'session_end', lessonId: undefined }),
  heartbeat: event({ type: 'heartbeat', lessonId: undefined }),
  lesson_open: event({ type: 'lesson_open' }),
  stage_enter: event({ type: 'stage_enter', stage: 'read' }),
  stage_complete: event({ type: 'stage_complete', stage: 'write' }),
  lesson_complete: event({ type: 'lesson_complete' }),
  quick_check_answer: event({ type: 'quick_check_answer', value: { q: 0, selected: 2, correct: false, attempt: 1 } }),
  quiz_start: event({ type: 'quiz_start', lessonId: undefined, value: { section: 'history' } }),
  quiz_answer: event({
    type: 'quiz_answer',
    lessonId: undefined,
    value: { section: 'history', q: 3, selected: 1, correct: true, attempt: 2 },
  }),
  quiz_submit: event({ type: 'quiz_submit', lessonId: undefined, value: { section: 'history', score: 8, total: 10, attempt: 1 } }),
  writing_saved: event({ type: 'writing_saved', stage: 'reflect', value: { words: 42 } }),
  simpler_toggle: event({ type: 'simpler_toggle', value: { level: 'simpler' } }),
  listen_play: event({ type: 'listen_play' }),
  video_choice: event({ type: 'video_choice', value: { choice: 'read' } }),
  video_play: event({ type: 'video_play' }),
  video_progress: event({ type: 'video_progress', value: { percent: 50 } }),
  video_fail: event({ type: 'video_fail', value: { reason: 'offline' } }),
};

function strip(input: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

describe('checkEvent', () => {
  it('has a valid example for every kind of event', () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual([...EVENT_TYPES].sort());
    for (const type of EVENT_TYPES) {
      const checked = checkEvent(strip(EXAMPLES[type]!));
      expect(checked.ok, `${type}: ${checked.ok ? '' : checked.error}`).toBe(true);
    }
  });

  it('returns a clean copy', () => {
    const checked = checkEvent(strip(EXAMPLES.quick_check_answer!));
    expect(checked.ok && checked.value.value).toEqual({ q: 0, selected: 2, correct: false, attempt: 1 });
  });

  it('refuses any key it does not know, anywhere', () => {
    for (const extra of ['name', 'text', 'answer', 'email', 'learner', 'recording']) {
      expect(checkEvent(event({ [extra]: 'x' })).ok).toBe(false);
    }
    expect(checkEvent(event({ value: { words: 3 } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'writing_saved', stage: 'write', value: { words: 3, text: 'hello' } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'writing_saved', stage: 'write', value: { words: 3, note: 'a' } })).ok).toBe(false);
  });

  it('refuses a name or free text in place of a pilot code', () => {
    for (const bad of ['Amina', 'amina', 'HLP-1', 'HLP-0001', 'hlp-01', 'Amina Rahimi', 'HLP-01 ', '', 7, null]) {
      expect(checkEvent(event({ pilotCode: bad })).ok, String(bad)).toBe(false);
    }
  });

  it('refuses a bad organisation code', () => {
    for (const bad of ['', 'A', 'Help Jakarta', 'help_jakarta', '-help', 'x'.repeat(40), 3]) {
      expect(checkEvent(event({ org: bad })).ok, String(bad)).toBe(false);
    }
    expect(checkEvent(event({ org: 'my-partner' })).ok).toBe(true);
  });

  it('refuses unknown types, including inherited names', () => {
    for (const bad of ['click', 'writing', '__proto__', 'constructor', 'toString', '', 1]) {
      expect(checkEvent(event({ type: bad })).ok, String(bad)).toBe(false);
    }
  });

  it('refuses text that is not a short, fixed shape', () => {
    expect(checkEvent(event({ lessonId: 'Towns near rivers' })).ok).toBe(false);
    expect(checkEvent(event({ lessonId: 'x'.repeat(65) })).ok).toBe(false);
    expect(checkEvent(event({ appVersion: 'a b' })).ok).toBe(false);
    expect(checkEvent(event({ id: 'not-a-uuid' })).ok).toBe(false);
    expect(checkEvent(event({ sessionId: 'HLP-01' })).ok).toBe(false);
  });

  it('refuses times that are not plausible', () => {
    for (const bad of [0, -1, 1.5, TS + 0.5, 9_999_999_999_999, '1790000000000', Number.NaN, null]) {
      expect(checkEvent(event({ ts: bad })).ok, String(bad)).toBe(false);
    }
  });

  it('needs the lesson and stage a kind of event is about, and no others', () => {
    expect(checkEvent(event({ lessonId: undefined })).ok).toBe(false);
    expect(checkEvent(event({ type: 'session_start' })).ok).toBe(false);
    expect(checkEvent(event({ type: 'stage_enter' })).ok).toBe(false);
    expect(checkEvent(event({ type: 'stage_enter', stage: 'dance' })).ok).toBe(false);
    expect(checkEvent(event({ type: 'lesson_complete', stage: 'read' })).ok).toBe(false);
    expect(checkEvent(event({ type: 'heartbeat', stage: 'read', lessonId: undefined })).ok).toBe(false);
    expect(checkEvent(event({ type: 'heartbeat', stage: 'read' })).ok).toBe(true);
    // Speak has no writing, so no word count.
    expect(checkEvent(event({ type: 'writing_saved', stage: 'speak', value: { words: 3 } })).ok).toBe(false);
  });

  it('checks each value field', () => {
    const answer = (value: Record<string, unknown>) => event({ type: 'quick_check_answer', value });
    const good = { q: 1, selected: 1, correct: true, attempt: 1 };
    expect(checkEvent(answer(good)).ok).toBe(true);
    expect(checkEvent(answer({ ...good, q: -1 })).ok).toBe(false);
    expect(checkEvent(answer({ ...good, q: 1.5 })).ok).toBe(false);
    expect(checkEvent(answer({ ...good, selected: 10 })).ok).toBe(false);
    expect(checkEvent(answer({ ...good, correct: 'yes' })).ok).toBe(false);
    expect(checkEvent(answer({ ...good, attempt: 0 })).ok).toBe(false);
    expect(checkEvent(answer({ q: 1, selected: 1, correct: true })).ok).toBe(false);
    expect(checkEvent(event({ type: 'writing_saved', stage: 'write', value: { words: 5001 } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'writing_saved', stage: 'write', value: { words: 'seven' } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'video_progress', value: { percent: 30 } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'simpler_toggle', value: { level: 'hard' } })).ok).toBe(false);
    expect(checkEvent(event({ type: 'video_fail', value: { reason: 'The video said hello' } })).ok).toBe(false);
  });

  it('only ever allows numbers, booleans and fixed words as values', () => {
    // No rule accepts arbitrary text, so no event can carry what a learner wrote.
    for (const spec of Object.values(EVENT_SPECS)) {
      for (const rule of Object.values(spec.value)) {
        expect(['int', 'oneOf', 'bool', 'enum', 'slug']).toContain((rule as { kind: string }).kind);
      }
    }
    // A long sentence in any field fails.
    const sentence = 'I think the river was important because people could grow food near it.';
    for (const type of EVENT_TYPES) {
      const example = strip(EXAMPLES[type]!);
      for (const key of Object.keys((example.value as Record<string, unknown>) ?? {})) {
        const copy = strip(example);
        (copy.value as Record<string, unknown>)[key] = sentence;
        expect(checkEvent(copy).ok, `${type}.${key}`).toBe(false);
      }
    }
  });

  it('names the field in an error, never its content', () => {
    const checked = checkEvent(event({ pilotCode: 'Amina Rahimi' }), 'events[2]');
    expect(checked).toEqual({ ok: false, error: 'events[2].pilotCode' });
    const key = checkEvent(event({ secret: 'Amina' }));
    expect(key.ok === false && key.error).toBe('event.secret is not allowed');
  });

  it('refuses things that are not objects', () => {
    for (const bad of [null, undefined, 'x', 3, [], true]) expect(checkEvent(bad).ok).toBe(false);
  });
});

describe('checkBatch', () => {
  const one = (id: string): MeasurementEvent => {
    const checked = checkEvent(event({ id }));
    if (!checked.ok) throw new Error(checked.error);
    return checked.value;
  };
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

  it('accepts 1 to 50 events', () => {
    expect(checkBatch({ v: 1, events: [one(id(1))] }).ok).toBe(true);
    const fifty = Array.from({ length: MAX_BATCH_EVENTS }, (_, i) => one(id(i)));
    expect(checkBatch({ v: 1, events: fifty }).ok).toBe(true);
  });

  it('refuses none, 51, a wrong version and extra keys', () => {
    expect(checkBatch({ v: 1, events: [] }).ok).toBe(false);
    const many = Array.from({ length: MAX_BATCH_EVENTS + 1 }, (_, i) => one(id(i)));
    expect(checkBatch({ v: 1, events: many }).ok).toBe(false);
    expect(checkBatch({ v: 2, events: [one(id(1))] }).ok).toBe(false);
    expect(checkBatch({ v: 1, events: [one(id(1))], note: 'hi' }).ok).toBe(false);
    expect(checkBatch({ events: [one(id(1))] }).ok).toBe(false);
    expect(checkBatch([]).ok).toBe(false);
    expect(checkBatch(null).ok).toBe(false);
  });

  it('points at the bad event and refuses a repeated id', () => {
    const bad = checkBatch({ v: 1, events: [one(id(1)), { ...one(id(2)), pilotCode: 'Amina' }] });
    expect(bad).toEqual({ ok: false, error: 'events[1].pilotCode' });
    const repeat = checkBatch({ v: 1, events: [one(id(1)), one(id(1))] });
    expect(repeat).toEqual({ ok: false, error: 'events[1].id repeats' });
  });
});
