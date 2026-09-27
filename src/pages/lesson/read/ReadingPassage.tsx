import { Fragment, useMemo } from 'react';
import { GlossaryTerm } from '../../../components/ds';
import type { GlossaryEntry } from '../../../content';
import { buildReading } from './readingPieces';

export interface ReadingPassageProps {
  /** One reading section's text, in the version on screen (Standard or Simpler). */
  text: string;
  glossary: readonly GlossaryEntry[];
}

/**
 * The paragraphs of one reading section, with each glossary word marked on
 * its first appearance in the section (a GlossaryTerm that opens its
 * definition). Goes inside a ReadingCard.
 */
export function ReadingPassage({ text, glossary }: ReadingPassageProps) {
  const paragraphs = useMemo(() => buildReading(text, glossary), [text, glossary]);
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.start} className="tw-read-para">
          {paragraph.segments.map((segment, index) =>
            segment.kind === 'text' ? (
              <Fragment key={index}>{segment.text}</Fragment>
            ) : (
              <GlossaryTerm
                key={index}
                word={segment.entry.word}
                definition={segment.entry.definition}
                example={segment.entry.example}
              >
                {segment.text}
              </GlossaryTerm>
            ),
          )}
        </p>
      ))}
    </>
  );
}
