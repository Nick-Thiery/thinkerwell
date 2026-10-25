import { describe, expect, it } from 'vitest';
import { commonStages, lessonStages, stageAfter, stageAmong, stageBefore, STAGES, STAGES_WITHOUT_WATCH } from './stages';

describe('a lesson with or without its Watch step', () => {
  it('has five steps, or four without Watch, always in the same order', () => {
    expect(lessonStages(true)).toEqual(['read', 'write', 'speak', 'watch', 'reflect']);
    expect(lessonStages(false)).toEqual(['read', 'write', 'speak', 'reflect']);
  });

  it('goes from Speak to Reflect, and back, without Watch', () => {
    expect(stageAfter(STAGES_WITHOUT_WATCH, 'speak')).toBe('reflect');
    expect(stageBefore(STAGES_WITHOUT_WATCH, 'reflect')).toBe('speak');
    expect(stageAfter(STAGES, 'speak')).toBe('watch');
    expect(stageBefore(STAGES, 'reflect')).toBe('watch');
    expect(stageAfter(STAGES, 'reflect')).toBeUndefined();
    expect(stageBefore(STAGES, 'read')).toBeUndefined();
  });

  it('shows the next step it has for a Watch it hasn’t got', () => {
    expect(stageAmong(STAGES_WITHOUT_WATCH, 'watch')).toBe('reflect');
    expect(stageAmong(STAGES_WITHOUT_WATCH, 'speak')).toBe('speak');
    expect(stageAmong(STAGES, 'watch')).toBe('watch');
  });

  it('says only what every lesson has', () => {
    expect(commonStages([true, true], lessonStages)).toEqual(STAGES);
    expect(commonStages([true, false], lessonStages)).toEqual(STAGES_WITHOUT_WATCH);
    expect(commonStages([false, false], lessonStages)).toEqual(STAGES_WITHOUT_WATCH);
  });
});
