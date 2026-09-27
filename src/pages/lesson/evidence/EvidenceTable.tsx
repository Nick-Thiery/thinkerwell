import { useLayoutEffect, useRef, useState } from 'react';
import type { EvidenceCard } from '../../../content';
import { useI18n } from '../../../i18n';

export interface EvidenceTableProps {
  card: Extract<EvidenceCard, { type: 'table' }>;
}

/**
 * A table evidence card as a real `<table>`: column headers are `th
 * scope="col"`, and the first cell of each row is its row header (in every
 * lesson's tables the first column names the row: a question, a time, a
 * resource).
 *
 * The table wraps its text to fit the reading column, so it normally never
 * scrolls. If a narrow screen or a long word still makes it wider than the
 * column, only the table's own region scrolls sideways (never the page),
 * and that region becomes focusable so keyboard users can scroll it too
 * (WCAG 2.1.1; axe's scrollable-region-focusable).
 */
export function EvidenceTable({ card }: EvidenceTableProps) {
  const { t } = useI18n();
  const regionRef = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region) return undefined;
    const target = region;
    function measure() {
      setScrolls(target.scrollWidth > target.clientWidth + 1);
    }
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    const table = target.firstElementChild;
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [card]);

  const [firstColumn, ...otherColumns] = card.columns;

  return (
    <div
      ref={regionRef}
      className="tw-lx-table-scroll"
      // A named, focusable region only when it actually scrolls, so it isn't
      // an empty tab stop or an extra landmark the rest of the time.
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? t('lessonPlayer.evidence.tableLabel', { title: card.title }) : undefined}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={scrolls ? 0 : undefined}
      data-scrolls={scrolls ? '' : undefined}
    >
      <table className="tw-lx-table">
        {/* The card's h3 already shows the title; the caption names the table for screen readers. */}
        <caption className="tw-visually-hidden">{card.title}</caption>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            {otherColumns.map((column, index) => (
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row, rowIndex) => {
            const [head, ...cells] = row;
            return (
              <tr key={rowIndex}>
                <th scope="row">{head}</th>
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
