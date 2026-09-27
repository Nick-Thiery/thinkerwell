import { Fragment, useMemo, type ReactNode } from 'react';
import { GlossaryTerm } from '../../../components/ds';
import type { GlossaryEntry } from '../../../content';
import type { GlossarySegment } from '../../../lesson';
import { buildReading, type TextRange } from './readingPieces';

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

function renderSegment(segment: GlossarySegment, key: number): ReactNode {
  if (segment.kind === 'text') return <Fragment key={key}>{segment.text}</Fragment>;
  return (
    <GlossaryTerm key={key} word={segment.entry.word} definition={segment.entry.definition} example={segment.entry.example}>
      {segment.text}
    </GlossaryTerm>
  );
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
      {paragraphs.map((paragraph) => {
        let key = 0;
        return (
          <p key={paragraph.start} className="tw-read-para">
            {paragraph.runs.map((run, runIndex) => {
              const nodes = run.segments.map((segment) => renderSegment(segment, key++));
              return run.highlighted ? (
                <mark key={`m${runIndex}`} className="tw-speaking">
                  {nodes}
                </mark>
              ) : (
                <Fragment key={`r${runIndex}`}>{nodes}</Fragment>
              );
            })}
          </p>
        );
      })}
    </>
  );
}
