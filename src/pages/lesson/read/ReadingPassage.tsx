import { Fragment, useMemo, type ReactNode } from 'react';
import { GlossaryTerm } from '../../../components/ds';
import type { GlossaryEntry } from '../../../content';
import { buildReading, type ReadingParagraph, type TextRange } from './readingPieces';

export interface ReadingPassageProps {
  /** One reading section's text, in the version on screen (Standard or Simpler). */
  text: string;
  glossary: readonly GlossaryEntry[];
  /**
   * The sentence Listen is reading aloud, as a character range in `text`.
   * Wrapped in <mark class="tw-speaking"> (the screen's one lemon highlight).
   */
  highlight?: TextRange | null;
}

/**
 * One paragraph's pieces as a flat list of children of its <p>, each keyed
 * by where it starts in the text.
 *
 * A glossary word is always a direct child of the paragraph, keyed by its
 * own position, which doesn't change while Listen moves on. So React keeps
 * the same GlossaryTerm from sentence to sentence, and an open definition
 * (and the focus on its word) stays put when the highlight reaches or
 * passes it. Wrapping the word in the sentence's <mark> would give it a new
 * parent, and React would replace it, closing the definition. Instead the
 * highlighted text on either side gets a <mark> of its own, and the word
 * carries the highlight inside its button.
 */
function renderParagraph(paragraph: ReadingParagraph): ReactNode[] {
  const nodes: ReactNode[] = [];
  let at = paragraph.start;
  for (const run of paragraph.runs) {
    let marked: { start: number; text: string } | null = null;
    const flushMark = () => {
      if (!marked) return;
      nodes.push(
        <mark key={`m${marked.start}`} className="tw-speaking">
          {marked.text}
        </mark>,
      );
      marked = null;
    };
    for (const segment of run.segments) {
      const start = at;
      at += segment.text.length;
      if (segment.kind === 'term') {
        flushMark();
        nodes.push(
          <GlossaryTerm
            key={`t${start}`}
            word={segment.entry.word}
            definition={segment.entry.definition}
            example={segment.entry.example}
          >
            {run.highlighted ? <mark className="tw-speaking">{segment.text}</mark> : segment.text}
          </GlossaryTerm>,
        );
      } else if (run.highlighted) {
        if (marked) marked.text += segment.text;
        else marked = { start, text: segment.text };
      } else {
        nodes.push(<Fragment key={`x${start}`}>{segment.text}</Fragment>);
      }
    }
    flushMark();
  }
  return nodes;
}

/**
 * The paragraphs of one reading section, with each glossary word marked on
 * its first appearance in the section (a GlossaryTerm that opens its
 * definition), and the sentence Listen is reading highlighted. Goes inside
 * a ReadingCard.
 */
export function ReadingPassage({ text, glossary, highlight }: ReadingPassageProps) {
  const start = highlight?.start;
  const end = highlight?.end;
  const paragraphs = useMemo(
    () => buildReading(text, glossary, start !== undefined && end !== undefined ? { start, end } : undefined),
    [text, glossary, start, end],
  );
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.start} className="tw-read-para">
          {renderParagraph(paragraph)}
        </p>
      ))}
    </>
  );
}
