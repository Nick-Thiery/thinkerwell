import { beforeEach, describe, expect, it, vi } from 'vitest';

// The collector is replaced, so what is tested is the front door: it must never load it unless a device shares.
const collector = vi.hoisted(() => ({
  loaded: vi.fn(),
  applyGate: vi.fn(() => Promise.resolve()),
  record: vi.fn(),
  leaveLesson: vi.fn(),
  forgetPilotCode: vi.fn(() => Promise.resolve()),
}));
vi.mock('./measurementCollector', () => {
  collector.loaded();
  return {
    applyGate: collector.applyGate,
    record: collector.record,
    leaveLesson: collector.leaveLesson,
    forgetPilotCode: collector.forgetPilotCode,
  };
});

const GATE = { org: 'help-jakarta', pilotCode: 'HLP-01' };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function freshTrack() {
  vi.resetModules();
  return import('./track');
}

describe('track (the front door)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('with sharing off, which is the default, never loads the collector, whatever is called', async () => {
    const t = await freshTrack();
    t.setMeasurementState(null, null);
    t.track('lesson_open', { lessonId: 'towns-near-rivers' });
    t.leaveLesson();
    t.forgetLearner('HLP-01');
    await flush();
    expect(collector.loaded).not.toHaveBeenCalled();
    expect(t.getMeasurementState()).toEqual({ org: null, gate: null });
  });

  it('with sharing on but nobody measured (a guest, a real name), loads the collector to wait but records nothing', async () => {
    const t = await freshTrack();
    t.setMeasurementState('help-jakarta', null);
    t.track('lesson_open', { lessonId: 'towns-near-rivers' });
    await flush();
    expect(collector.applyGate).toHaveBeenCalledWith('help-jakarta', null);
    expect(collector.record).not.toHaveBeenCalled();
  });

  it('with a measured learner, passes what happened to the collector with that learner\'s gate', async () => {
    const t = await freshTrack();
    t.setMeasurementState('help-jakarta', GATE);
    t.track('stage_enter', { lessonId: 'towns-near-rivers', stage: 'read' });
    await flush();
    expect(collector.applyGate).toHaveBeenCalledWith('help-jakarta', GATE);
    expect(collector.record).toHaveBeenCalledWith(GATE, 'stage_enter', { lessonId: 'towns-near-rivers', stage: 'read' });
  });

  it('tells the collector when sharing is turned off, and stops passing things on', async () => {
    const t = await freshTrack();
    t.setMeasurementState('help-jakarta', GATE);
    await flush();
    t.setMeasurementState(null, null);
    t.track('lesson_open', { lessonId: 'towns-near-rivers' });
    await flush();
    expect(collector.applyGate).toHaveBeenLastCalledWith(null, null);
    expect(collector.record).not.toHaveBeenCalled();
  });

  it('does nothing when the state has not changed', async () => {
    const t = await freshTrack();
    t.setMeasurementState('help-jakarta', GATE);
    await flush();
    t.setMeasurementState('help-jakarta', { ...GATE });
    await flush();
    expect(collector.applyGate).toHaveBeenCalledTimes(1);
  });

  it('forgets a removed learner\'s waiting results only by their pilot code, never a name', async () => {
    const t = await freshTrack();
    t.setMeasurementState('help-jakarta', GATE);
    await flush();
    t.forgetLearner('Amina');
    t.forgetLearner(' hlp-01 ');
    await flush();
    expect(collector.forgetPilotCode).toHaveBeenCalledTimes(1);
    expect(collector.forgetPilotCode).toHaveBeenCalledWith('HLP-01');
  });
});
