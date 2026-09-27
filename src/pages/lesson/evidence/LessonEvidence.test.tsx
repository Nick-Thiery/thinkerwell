import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { getCourse, getLessons, type Evidence, type EvidenceCard } from '../../../content';
import { I18nProvider } from '../../../i18n';
import { LessonEvidence } from './LessonEvidence';

/** Every piece of text a card must show, whatever its type. */
function cardTexts(card: EvidenceCard): string[] {
  switch (card.type) {
    case 'items':
      return card.items;
    case 'timeline':
      return card.events.flatMap((event) => [event.year, event.text]);
    case 'map':
      return [
        ...card.locations.flatMap((location) => [location.label, location.description]),
        ...card.legend.map((entry) => entry.label),
      ];
    case 'cases':
      return card.cases.flatMap((item) => [item.name, item.body]);
    case 'sources':
      return card.sources.flatMap((source) => [source.caption, ...source.details]);
    case 'table':
      return [...card.columns, ...card.rows.flat()];
  }
}

function renderEvidence(evidence: Evidence, mapDrawn = false) {
  return render(
    <I18nProvider>
      <LessonEvidence evidence={evidence} mapDrawn={mapDrawn} />
    </I18nProvider>,
  );
}

const fictionLabel = getCourse().fictionLabel;

describe('LessonEvidence', () => {
  let errorSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error');
    warnSpy = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('covers every card type the content uses', () => {
    const used = new Set(getLessons().flatMap((lesson) => lesson.evidence.cards.map((card) => card.type)));
    expect([...used].sort()).toEqual(['cases', 'items', 'map', 'sources', 'table', 'timeline']);
  });

  describe.each(getLessons().map((lesson) => [`Lesson ${lesson.number} (${lesson.id})`, lesson] as const))(
    '%s',
    (_name, lesson) => {
      it('shows the question, every card title and every piece of evidence, with no console errors', () => {
        const { container } = renderEvidence(lesson.evidence);
        const section = screen.getByRole('region', { name: 'Evidence' });

        expect(within(section).getByText(lesson.evidence.question)).toBeInTheDocument();

        const titles = within(section)
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent);
        expect(titles).toEqual(lesson.evidence.cards.map((card) => card.title));

        // Each card is a figure named by its title.
        for (const card of lesson.evidence.cards) {
          const figure = within(section).getByRole('figure', { name: card.title });
          for (const text of cardTexts(card)) {
            expect(figure.textContent).toContain(text);
          }
        }

        // Tables are real tables with column and row headers.
        for (const card of lesson.evidence.cards) {
          if (card.type !== 'table') continue;
          const table = within(section).getByRole('table', { name: card.title });
          expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(card.columns);
          expect(within(table).getAllByRole('rowheader').map((th) => th.textContent)).toEqual(
            card.rows.map((row) => row[0]),
          );
          expect(within(table).getAllByRole('cell').map((td) => td.textContent)).toEqual(
            card.rows.flatMap((row) => row.slice(1)),
          );
        }

        // The fiction label (from course.json) and badge show exactly when fictional.
        const labelShown = (container.textContent ?? '').includes(fictionLabel);
        expect(labelShown).toBe(lesson.evidence.fictional);
        expect(container.querySelectorAll('.tw-badge-lavender')).toHaveLength(lesson.evidence.fictional ? 1 : 0);

        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
      });
    },
  );

  it('shows no fiction label or badge for real evidence', () => {
    const real: Evidence = {
      fictional: false,
      label: null,
      question: 'What does this record tell you?',
      cards: [{ type: 'items', title: 'A real record', items: ['First thing', 'Second thing'] }],
    };
    const { container } = renderEvidence(real);

    expect(container.textContent).not.toContain(fictionLabel);
    expect(screen.queryByText(/^Fictional/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'A real record' })).toBeInTheDocument();
  });

  it('takes the fiction label from course.json, not from the lesson', () => {
    const fictional: Evidence = {
      fictional: true,
      label: 'A label written in the lesson file',
      question: 'What do you notice?',
      cards: [{ type: 'items', title: 'Made up', items: ['One'] }],
    };
    const { container } = renderEvidence(fictional);

    expect(container.textContent).toContain(fictionLabel);
    expect(container.textContent).not.toContain('A label written in the lesson file');
    expect(screen.getByText('Fictional examples')).toBeInTheDocument();
  });

  it('puts the fictional badge on the first card only', () => {
    const lesson = getLessons().find((l) => l.evidence.fictional && l.evidence.cards.length > 1);
    expect(lesson).toBeDefined();
    renderEvidence(lesson!.evidence);

    const [first, ...rest] = screen.getAllByRole('figure');
    expect(first).toBeDefined();
    expect(within(first!).getByText(/^Fictional /)).toBeInTheDocument();
    for (const figure of rest) expect(within(figure).queryByText(/^Fictional /)).not.toBeInTheDocument();
  });

  it('names the kind of card in the fictional badge ("Fictional map")', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers');
    renderEvidence(lesson!.evidence);
    expect(screen.getByText('Fictional map')).toBeInTheDocument();
  });

  it('gives each figure a type class that no inner element uses', () => {
    for (const lesson of getLessons()) {
      const { container, unmount } = renderEvidence(lesson.evidence);
      for (const [index, figure] of [...container.querySelectorAll('figure')].entries()) {
        const type = lesson.evidence.cards[index]!.type;
        expect(figure).toHaveClass('tw-lx-card', `tw-lx-card-${type}`);
        for (const name of figure.classList) {
          expect(figure.querySelector(`.${name}`), `${lesson.id}: .${name} inside its own figure`).toBeNull();
        }
      }
      unmount();
    }
  });

  it('lists the map key without colour swatches until the map picture exists', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers');
    renderEvidence(lesson!.evidence);
    expect(screen.getByRole('list', { name: 'Map key' })).toBeInTheDocument();
    expect(document.querySelector('.tw-lx-swatch')).toBeNull();
  });

  it('shows the map key with a swatch per legend colour once the map is drawn', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers');
    expect(lesson).toBeDefined();
    renderEvidence(lesson!.evidence, true);

    const key = screen.getByRole('list', { name: 'Map key' });
    const map = lesson!.evidence.cards.find((card) => card.type === 'map');
    if (map?.type !== 'map') throw new Error('Lesson 10 has a map card');
    const entries = within(key).getAllByRole('listitem');
    expect(entries.map((li) => li.textContent)).toEqual(map.legend.map((entry) => entry.label));
    expect(entries.map((li) => li.querySelector('.tw-lx-swatch')?.getAttribute('data-color'))).toEqual(
      map.legend.map((entry) => entry.color),
    );
    expect(within(screen.getByRole('list', { name: 'Places' })).getAllByRole('listitem')).toHaveLength(
      map.locations.length,
    );
  });

  it('keeps a table that fits out of the tab order', () => {
    const lesson = getLessons().find((l) => l.evidence.cards.some((card) => card.type === 'table'));
    renderEvidence(lesson!.evidence);

    // jsdom has no layout, so the table never measures as wider than its box.
    const scroller = document.querySelector('.tw-lx-table-scroll');
    expect(scroller).not.toHaveAttribute('tabindex');
    expect(scroller).not.toHaveAttribute('role');
  });

  it('makes a table that has to scroll a named, focusable region', () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const lesson = getLessons().find((l) => l.id === 'farming-changes-societies');
    renderEvidence(lesson!.evidence);

    const region = screen.getByRole('region', { name: 'Table: Two ways of life in Harapan Valley' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(scrollWidth).toHaveBeenCalled();
    expect(clientWidth).toHaveBeenCalled();
  });
});
