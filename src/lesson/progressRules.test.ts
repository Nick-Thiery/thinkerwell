import { getLesson, type Lesson } from '../content';
import { emptyProgress, type LessonProgress } from '../storage';
import {
  allChoiceChecksAnswered,
  applyStageEvent,
  choiceCheckIndexes,
  eventMarksStageDone,
  isRequiredReflectionAnswered,
  requiredReflectIndex,
  withStageDone,
} from './progressRules';

const lesson = getLesson('towns-near-rivers') as Lesson;
const NOW = '2026-09-27T10:00:00.000Z';
const fresh = (): LessonProgress => emptyProgress('learner-1', lesson.id);

describe('quick-check helpers', () => {
  it('finds the choice questions', () => {
    expect(choiceCheckIndexes(lesson)).toEqual([0, 1]);
  });

  it('counts right and wrong answers alike, and never needs the think question', () => {
    expect(allChoiceChecksAnswered(lesson, {})).toBe(false);
    expect(allChoiceChecksAnswered(lesson, { 0: { type: 'choice', selected: 1, correct: false, tries: 1 } })).toBe(false);
    expect(
      allChoiceChecksAnswered(lesson, {
        0: { type: 'choice', selected: 1, correct: false, tries: 1 },
        1: { type: 'choice', selected: 2, correct: true, tries: 1 },
      }),
    ).toBe(true);
  });
});

describe('Read', () => {
  it('is done once every choice question is answered', () => {
    const one = { ...fresh(), checkAnswers: { 0: { type: 'choice' as const, selected: 0, correct: true, tries: 1 } } };
    expect(eventMarksStageDone(lesson, one, { stage: 'read', kind: 'check-answered' })).toBe(false);
    const both = { ...one, checkAnswers: { ...one.checkAnswers, 1: { type: 'choice' as const, selected: 0, correct: false, tries: 2 } } };
    expect(applyStageEvent(lesson, both, { stage: 'read', kind: 'check-answered' }, NOW).stagesDone).toEqual(['read']);
  });

  it('is done when the learner continues from Read, answered or not', () => {
    expect(applyStageEvent(lesson, fresh(), { stage: 'read', kind: 'continue' }, NOW).stagesDone).toEqual(['read']);
  });
});

describe('Write', () => {
  it('needs some writing before continue counts', () => {
    expect(applyStageEvent(lesson, fresh(), { stage: 'write', kind: 'continue' }, NOW).stagesDone).toEqual([]);
    const blank = { ...fresh(), writing: { ...fresh().writing, text: '   \n ' } };
    expect(applyStageEvent(lesson, blank, { stage: 'write', kind: 'continue' }, NOW).stagesDone).toEqual([]);
    const written = { ...fresh(), writing: { ...fresh().writing, text: 'I would build at the River site.' } };
    expect(applyStageEvent(lesson, written, { stage: 'write', kind: 'continue' }, NOW).stagesDone).toEqual(['write']);
  });
});

describe('Speak', () => {
  it('is done when the learner chooses how they practised', () => {
    expect(applyStageEvent(lesson, fresh(), { stage: 'speak', kind: 'practised' }, NOW).stagesDone).toEqual([]);
    const chosen = { ...fresh(), speak: { practisedHow: 2 } };
    expect(applyStageEvent(lesson, chosen, { stage: 'speak', kind: 'practised' }, NOW).stagesDone).toEqual(['speak']);
    expect(applyStageEvent(lesson, fresh(), { stage: 'speak', kind: 'continue' }, NOW).stagesDone).toEqual([]);
  });
});

describe('Watch', () => {
  it('is done on continue, or once the after question has an answer', () => {
    expect(applyStageEvent(lesson, fresh(), { stage: 'watch', kind: 'continue' }, NOW).stagesDone).toEqual(['watch']);
    expect(applyStageEvent(lesson, fresh(), { stage: 'watch', kind: 'after-answered' }, NOW).stagesDone).toEqual([]);
    const answered = { ...fresh(), watch: { ...fresh().watch, afterAnswer: 'Fertile land.' } };
    expect(applyStageEvent(lesson, answered, { stage: 'watch', kind: 'after-answered' }, NOW).stagesDone).toEqual(['watch']);
  });
});

describe('Reflect', () => {
  it('finds the required prompt', () => {
    expect(requiredReflectIndex(lesson)).toBe(0);
  });

  it('completes the lesson only when the required prompt is answered', () => {
    const optionalOnly = { ...fresh(), reflections: { 1: 'A question I have.' } };
    expect(isRequiredReflectionAnswered(lesson, optionalOnly)).toBe(false);
    const notYet = applyStageEvent(lesson, optionalOnly, { stage: 'reflect', kind: 'finish' }, NOW);
    expect(notYet.completedAt).toBeNull();
    expect(notYet.stagesDone).toEqual([]);

    const answered = { ...fresh(), reflections: { 0: 'Rivers help towns.' } };
    const done = applyStageEvent(lesson, answered, { stage: 'reflect', kind: 'finish' }, NOW);
    expect(done.stagesDone).toEqual(['reflect']);
    expect(done.completedAt).toBe(NOW);
  });

  it('completes the lesson as soon as the required prompt is answered, without Finish', () => {
    const blank = { ...fresh(), reflections: { 0: '   ' } };
    expect(applyStageEvent(lesson, blank, { stage: 'reflect', kind: 'answered' }, NOW)).toBe(blank);
    const answered = { ...fresh(), reflections: { 0: 'Rivers help towns.' } };
    const done = applyStageEvent(lesson, answered, { stage: 'reflect', kind: 'answered' }, NOW);
    expect(done.stagesDone).toEqual(['reflect']);
    expect(done.completedAt).toBe(NOW);
  });

  it('keeps the first completion date when a learner finishes again', () => {
    const first = { ...fresh(), reflections: { 0: 'Rivers help.' }, stagesDone: ['reflect' as const], completedAt: '2026-01-01T00:00:00.000Z' };
    expect(applyStageEvent(lesson, first, { stage: 'reflect', kind: 'finish' }, NOW).completedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('withStageDone', () => {
  it('adds a stage once, in the order finished', () => {
    const a = withStageDone(fresh(), 'write');
    const b = withStageDone(a, 'read');
    expect(b.stagesDone).toEqual(['write', 'read']);
    expect(withStageDone(b, 'write')).toBe(b);
  });

  it('returns the same object when an event changes nothing', () => {
    const p = fresh();
    expect(applyStageEvent(lesson, p, { stage: 'write', kind: 'continue' }, NOW)).toBe(p);
  });
});
