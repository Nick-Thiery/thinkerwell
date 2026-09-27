import { describe, expect, it } from 'vitest';
import { composeDictation, dictationAnchor, joinTranscript } from './dictationText';

function dictate(text: string, caret: number | null, words: string) {
  return composeDictation(dictationAnchor(text, caret), words);
}

describe('dictation text', () => {
  it('fills an empty box, starting with a capital', () => {
    expect(dictate('', null, 'near the river')).toEqual({ text: 'Near the river', caret: 14 });
  });

  it('goes at the end when the caret is unknown, with a space and a new sentence capital', () => {
    expect(dictate('I chose the hill.', null, 'it is safe')).toEqual({
      text: 'I chose the hill. It is safe',
      caret: 28,
    });
  });

  it('continues a sentence in lower case', () => {
    expect(dictate('I chose the hill because', null, 'it is safe').text).toBe('I chose the hill because it is safe');
  });

  it('goes in at the caret without replacing anything, with spaces either side', () => {
    const text = 'One reason is water. Another is food.';
    const result = dictate(text, 20, 'rivers give fish');
    expect(result.text).toBe('One reason is water. Rivers give fish Another is food.');
    expect(result.caret).toBe(37);
  });

  it("doesn't add a space before punctuation", () => {
    expect(dictate('It is safe.', 10, 'and dry').text).toBe('It is safe and dry.');
  });

  it('leaves the text alone when nothing was heard', () => {
    expect(dictate('Hello', 2, '   ')).toEqual({ text: 'Hello', caret: 2 });
  });

  it('clamps a caret beyond the text', () => {
    expect(dictate('Hi', 99, 'there').text).toBe('Hi there');
  });

  it('joins recognised pieces with tidy spaces', () => {
    expect(joinTranscript(['near the river', ' and', '  the hill '])).toBe('near the river and the hill');
    expect(joinTranscript([])).toBe('');
  });
});
