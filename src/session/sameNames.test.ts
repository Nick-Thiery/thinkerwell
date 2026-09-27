// @vitest-environment node
import type { Learner } from '../storage';
import { addedOn, learnersWithSameName } from './sameNames';

const learner = (id: string, name: string, createdAt = '2026-09-28T09:00:00.000Z'): Learner => ({ id, name, colour: 'lemon', createdAt });

describe('learnersWithSameName', () => {
  it('finds learners who share a name, ignoring case and spaces', () => {
    const learners = [learner('1', 'Amina'), learner('2', 'Yusuf'), learner('3', ' amina '), learner('4', 'AMINA'), learner('5', 'Omar')];
    expect([...learnersWithSameName(learners)].sort()).toEqual(['1', '3', '4']);
    expect(learnersWithSameName([learner('1', 'Amina'), learner('2', 'Yusuf')]).size).toBe(0);
    expect(learnersWithSameName([]).size).toBe(0);
  });
});

describe('addedOn', () => {
  it('gives the day a learner was added, short', () => {
    expect(addedOn(learner('1', 'Amina', '2026-09-02T09:00:00.000Z'), 'en')).toBe('Sep 2, 2026');
    expect(addedOn(learner('1', 'Amina', 'not a date'), 'en')).toBe('');
  });
});
