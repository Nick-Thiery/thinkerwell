import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { cx } from './internal/cx';
import './ReadingCard.css';

export interface ReadingCardProps {
  /** Free-text override, e.g. a custom label. Takes precedence over `partNumber`/`partTotal`. */
  part?: string;
  /** With `partTotal`, builds the "Part {n} of {total}" label from `ds.content.reading.part`. */
  partNumber?: number;
  partTotal?: number;
  heading?: string;
  children: ReactNode;
  className?: string;
}

/** One reading passage or part of one, with glossary words marked inline. */
export function ReadingCard({ part, partNumber, partTotal, heading, children, className }: ReadingCardProps) {
  const { t } = useI18n();
  const partLabel =
    part ?? (partNumber && partTotal ? t('ds.content.reading.part', { n: partNumber, total: partTotal }) : undefined);
  return (
    <article className={cx('tw-reading', className)}>
      {partLabel ? <span className="tw-reading-part">{partLabel}</span> : null}
      {heading ? <h3 className="tw-reading-h">{heading}</h3> : null}
      {/*
        A div, not a <p>: lesson text is authored as more than one paragraph
        (content/lessons/*.json), so children are typically several <p>
        elements already, which a single wrapping <p> couldn't legally
        contain. (An opened GlossaryTerm's DefinitionCard popover is itself
        phrasing content, so it's fine inside a <p> too — see
        DefinitionCard.tsx.)
      */}
      <div className="tw-reading-text">{children}</div>
    </article>
  );
}
