import { describe, expect, it } from 'vitest';
import { insertStarter, starterText } from './insertStarter';

describe('starterText', () => {
  it('drops trailing dots and leaves a space to carry on typing', () => {
    expect(starterText('One reason is...')).toBe('One reason is ');
    expect(starterText('One reason is…')).toBe('One reason is ');
  });

  it('keeps a starter with a blank as written', () => {
    expect(starterText('I would build the new town at the ___ site.')).toBe('I would build the new town at the ___ site.');
  });
});

describe('insertStarter', () => {
  it('goes at the end when the box was never focused', () => {
    expect(insertStarter('I like rivers.', 'One reason is...', null)).toEqual({
      text: 'I like rivers. One reason is ',
      selectionStart: 29,
      selectionEnd: 29,
    });
  });

  it('goes into an empty box without a leading space', () => {
    expect(insertStarter('', 'One reason is...', null).text).toBe('One reason is ');
  });

  it('goes at the caret, adding spaces only where needed', () => {
    const text = 'First.Last.';
    const result = insertStarter(text, 'One reason is...', 6);
    expect(result.text).toBe('First. One reason is Last.');
    expect(result.selectionStart).toBe('First. One reason is '.length);

    const spaced = insertStarter('First. Last.', 'One reason is...', 7);
    expect(spaced.text).toBe('First. One reason is Last.');
  });

  it('selects the first blank so typing fills it in', () => {
    const result = insertStarter('Hello.', 'I would build the new town at the ___ site.', null);
    expect(result.text).toBe('Hello. I would build the new town at the ___ site.');
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('___');
  });

  it('adds a space after a blank starter put before other words', () => {
    const result = insertStarter('Done.', 'One problem could be ___.', 0);
    expect(result.text).toBe('One problem could be ___. Done.');
  });

  it('clamps a caret past the end of the text', () => {
    expect(insertStarter('Hi', 'One reason is...', 99).text).toBe('Hi One reason is ');
  });
});
